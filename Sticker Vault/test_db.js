const { initDatabase, DB_PATH } = require('./dist/lib/db.js');
console.log("DB_PATH:", DB_PATH);
initDatabase().then(() => console.log("OK")).catch(console.error);
