
//This consumer is  sending data on web page

var express = require('express');
var app = express();
var server = app.listen(3001, () => {
    console.log("\nL35 app started on port 3001\n\n");
});
app.use(express.static('public'));
var io = require('socket.io').listen(server);
const topicName = 'OPCUA_ET200sp';

// kafka consumer 2

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

    // utility functrion for sending data on web page through scoket
    callSockets(io, message.value);
    // adding fields to data base but remember to convert back to JSON first then read its properties
    // console.log('L_3',JSON.parse(message.value).time_stamp);

    console.log('L4_Data Cahanged: ', message.value + '::==>' + new Date());

});

function callSockets(io, message) {
    //console.log('L5_',typeof (message));
    //console.log("L6_s.IO =====>>>>>>", message);
    io.sockets.emit('update', message);
}


consumer.on('error', function (err) {
    console.log('L7_error', err);
});

