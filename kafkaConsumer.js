
// This consumer is sending data on Data Base

var db = require('./database');
const topicName = 'OPCUA_ET200sp';

// kafka consumer

var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    client = new kafka.KafkaClient('localhost:2181'),
    consumer = new Consumer(
        client,
        [
            { topic: topicName, partition: 0 }
        ],
        {
            autoCommit: true,
            fetchMaxWaitMs: 1000,
            fetchMaxBytes: 1024 * 1024,
            encoding: 'utf8',
            fromOffset: false
        }
    );
// message contains kafka consumer's attributes in stringified version
// here only its value attribute is concerned, which contain published data from consumer 

consumer.on('message', function (message) {
    // If you want details then please uncomment following two lines
    //console.log('L1_Message sent from broker:  ', (message.value), '\n');
    //console.log('L2_MESSAGE.VALUE:  ', (message.value), '\n');
    // converting published string data back to JSON
    let data = JSON.parse(message.value);
    // adding fields to data base but remember to convert back to JSON first then read its properties
    // console.log('L_3',JSON.parse(message.value).time_stamp);

    db.adding_fields(data.name,
        data.NodeID.split(';')[0],
        data.NodeID.split(';')[1],
        data.measured_value,
        data.time_stamp
    );

    console.log('L4_Data Cahanged: ', message.value + '::==>' + new Date());

});


consumer.on('error', function (err) {
    console.log('L7_error', err);
});

