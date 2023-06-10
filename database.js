// importing DB
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('measurements.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('L8 ERROR: ', err.message);
    }
    console.log('L9 Connected to the measuremnts database.\n\n');
});

// creating measurements table
db.run('CREATE TABLE IF NOT EXISTS Measurement_Record(MonitoredVariables text,Name_Space text,Node_ID text,Value integer,Time text)');

// common fuctions for data base population

// insert one row into the measurements table
function adding_fields(MonitoredVariables, Name_Space, Node_ID, Value, date) {
    db.run('INSERT INTO Measurement_Record(MonitoredVariables,Name_Space,Node_ID,Value,Time) VALUES(?,?,?,?,?)',
        [MonitoredVariables, Name_Space, Node_ID, Value, date], function (err) {
            if (err) {
                return console.log('L21: ', err.message);
            }
            // get the last insert id
            console.log(`L10_A row has been inserted with row_id ${this.lastID}`, '\n');
        });
}

module.exports = {
    adding_fields
}

//DataBase end 