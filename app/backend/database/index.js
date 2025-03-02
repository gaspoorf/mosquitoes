import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { dirname, join } from 'node:path';
import { kill } from 'node:process';
import { fileURLToPath } from 'node:url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

const filePath = join(__dirname, 'db.json');
const file = new JSONFile(filePath);
const defaultData = { mosquitoes: [] }
const db = new Low(file, defaultData);

const readData = async () => {
    await db.read();
    db.data ||= { mosquitoes: [] };
    return db.data;
}

export const addMosquitoKill = async (date, co2Level, mosquitoKills) => {
    await db.read();
    
    const newRecord = {
        id: Date.now(),
        date,
        co2Level,
        mosquitoKills
    };

    db.data.mosquitoes.push(newRecord);
    await db.write();

    return newRecord;
};

export const getGlobalStatistics = async () => {
    return {
        totalKillsFromBeginning: await getTotalKillsFromBeginning(),
        totalKillsOfTheMonth: await getTotalKillsOfTheMonth(),
        totalKillsLastMonth: await getTotalKillsLastMonth(),
        totalKillsLastWeek: await getTotalKillsLastWeek(),
        totalKillsLastDay: await getTotalKillsLastDay(),
        averageKillsByDay: await getAverageKillsByDay(),
        mostActiveTimeSlotLastDay: await getMostActiveTimeSlotLastDay(),
    };
}

export const getTotalKillsFromBeginning = async () => {
    const data = await readData();

    const totalKills = data.mosquitoes.reduce((acc, curr) => acc + curr.mosquitoKills, 0);
    return totalKills;
};

export const getTotalKillsOfTheMonth = async () => {
    const data = await readData();

    const currentMonth = new Date().getMonth();
    const totalKills = data.mosquitoes.reduce((acc, curr) => {
        const entryDate = new Date(curr.date.split(' ')[0].split('/').reverse().join('-'));
        if (entryDate.getMonth() === currentMonth) {
            acc += curr.mosquitoKills;
        }
        return acc;
    }, 0);
    return totalKills;
}

export const getTotalKillsLastMonth = async () => {
    const data = await readData();

    const lastMonth = new Date().getMonth() - 1;
    const totalKills = data.mosquitoes.reduce((acc, curr) => {
        const entryDate = new Date(curr.date.split(' ')[0].split('/').reverse().join('-'));
        if (entryDate.getMonth() === lastMonth) {
            acc += curr.mosquitoKills;
        }
        return acc;
    }, 0);
    return totalKills;
};

export const getTotalKillsLastWeek = async () => {
    const data = await readData();

    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const totalKills = data.mosquitoes.reduce((acc, curr) => {
        const entryDate = new Date(curr.date.split(' ')[0].split('/').reverse().join('-'));
        if (entryDate >= lastWeek && entryDate <= today) {
            acc += curr.mosquitoKills;
        }
        return acc;
    }, 0);
    return totalKills;
};

export const getTotalKillsLastDay = async () => {
    const data = await readData();

    const lastDay = new Date().getDate() - 1;
    const totalKills = data.mosquitoes.reduce((acc, curr) => {
        const entryDate = new Date(curr.date.split(' ')[0].split('/').reverse().join('-'));
        if (entryDate.getDate() === lastDay) {
            acc += curr.mosquitoKills;
        }
        return acc;
    }, 0);
    return totalKills;
}

export const getAverageKillsByDay = async () => {
    const data = await readData();

    const killsByDay = data.mosquitoes.reduce((acc, curr) => {
        const entryDate = new Date(curr.date.split(' ')[0].split('/').reverse().join('-'));
        const day = entryDate.getDate();
        acc[day] ||= 0;
        acc[day] += curr.mosquitoKills;
        return acc;
    }, {});

    const averageKillsByDay = Object.values(killsByDay).reduce((acc, curr) => acc + curr, 0) / Object.keys(killsByDay).length;
    return averageKillsByDay;
};


export const getMostActiveTimeSlotLastDay = async () => {
    const data = await readData();

    // 1. Get the current date and calculate yesterday's date.
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    // 2. Filter the data from the DB for the previous day
    const yesterdayData = data.mosquitoes.filter(entry => {
        // Split the date part and rearrange from DD/MM/YYYY to YYYY-MM-DD
        const [datePart, timePart] = entry.date.split(' ');
        const formattedDate = datePart.split('/').reverse().join('-'); // "YYYY-MM-DD" format
        const entryDate = new Date(`${formattedDate}T${timePart}`); // Combine date and time for valid Date object
        
        return entryDate.getDate() === yesterday.getDate();
    });

    // 3. Create an array to store kills per hour (24 entries, one for each hour)
    const killsPerHour = new Array(24).fill(0);

    yesterdayData.forEach(entry => {
        // Reconstruct the full datetime string to create a valid Date object
        const [datePart, timePart] = entry.date.split(' ');
        const formattedDate = datePart.split('/').reverse().join('-'); // "YYYY-MM-DD" format
        const entryDate = new Date(`${formattedDate}T${timePart}`); // Combine date and time for valid Date object
        
        const entryHour = entryDate.getHours(); // Get the hour from the entry
        killsPerHour[entryHour] += entry.mosquitoKills; // Add the kills to the corresponding hour
    });

    // 4. Group kills into 4-hour time slots and calculate the total kills per slot
    const timeSlots = [];
    for (let i = 0; i < 24; i += 4) {
        const slotKills = killsPerHour.slice(i, i + 4).reduce((acc, curr) => acc + curr, 0);
        timeSlots.push({
            startHour: i,
            endHour: i + 4,
            totalKills: slotKills
        });
    }

    // 5. Find the most active time slot
    const mostActiveTimeSlot = timeSlots.reduce((acc, curr) => {
        return curr.totalKills > acc.totalKills ? curr : acc;
    }, { totalKills: 0 });

    // 6. Calculate the percentage of kills for the most active time slot compared to the total kills of the day
    const totalKillsYesterday = killsPerHour.reduce((acc, curr) => acc + curr, 0);
    const percentage = (mostActiveTimeSlot.totalKills / totalKillsYesterday) * 100;

    // 7. Return the most active time slot and the percentage of total kills
    return {
        mostActiveTimeSlot,
        percentage
    };
};

export const getDeviceData = async () => {
    return {
        currentCO2Level: await getCurrentCO2Level(),
    };
}

export const getCurrentCO2Level = async () => {
    const data = await readData();

    // Get the latest row
    const lastEntry = data.mosquitoes[data.mosquitoes.length - 1];
    return lastEntry.co2Level;
};