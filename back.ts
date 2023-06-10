/*global require,console,setTimeout */
//declaration
import {
    OPCUAClient,
    MessageSecurityMode, SecurityPolicy,
    AttributeIds,
    makeBrowsePath,
    ClientSubscription,
    TimestampsToReturn,
    MonitoringParametersOptions,
    ReadValueIdLike,
    ClientMonitoredItem,
    DataValue
} from "node-opcua";
var opcua = require("node-opcua");
// kafka stuff

var kafka = require('kafka-node'); // importing kafka-node library
var Producer = kafka.Producer;
var kafkaclient = new kafka.KafkaClient('localhost:2181'); // istaseating kafka client 
var producer = new Producer(kafkaclient); // instentiating kafka producer
const topicName = 'OPCUA_ET200sp';
producer.on('ready', function () { console.log('Connected to Kafka!'); });

// Initializing arrays for holding node ids and monitired items
var nodeIds = new Array(); // holds OPCUA nodeID for each sensor
var MonitoredItems = new Array(); // holds monitoried item objects
var IOs = ["INPUT_1", "INPUT_2", "MOTOR"];
addingNodes(nodeIds, "ns=3;s=\"INPUT_1\"");
addingNodes(nodeIds, "ns=3;s=\"INPUT_2\"");
addingNodes(nodeIds, "ns=3;s=\"MOTOR\"");



//console.log(nodeIds);


// ends connection after one unuccessful retry
/*
const connectionStrategy = {
    initialDelay: 1000,
    maxRetry: 100
}
*/
//useing un-secure connection by setting securityMode to None and securityPolicy to None.

const options = {
    applicationName: "ET200sp OPCUA Client",
    //connectionStrategy: connectionStrategy,
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpoint_must_exist: false,
};
//instansiating OPCUA client
const client = OPCUAClient.create(options);
// ET200sp OPCUA server at Processing Station's endpoint
const endpointUrl = "opc.tcp://10.1.1.6:4840";

//setting up a skeleton for the general schedule of the clients life-cycle with placeholders for the actual functions

async function main() {
    try {
        // step 1 : connect to
        await client.connect(endpointUrl);
        console.log("connected !");

        // step 2 : createSession
        const session = await client.createSession();
        console.log("session created !");

        // step 3 : browse the RootFolder to receive a list of all of it's child nodes
        const browseResult = await session.browse("RootFolder"); // returns references object 

        console.log("L73 references of RootFolder :");
        for (const reference of browseResult.references) {
            console.log("L75   -> ", reference.browseName.toString());
        }


        // step 4 : read a variable with readVariableValue
        for (var i = 0; i < nodeIds.length; i++) {
            var value = await session.readVariableValue(nodeIds[i]);
            console.log('\n', nodeIds[i])
            console.log(IOs[i], "L83====>>> ", value.toString());
        }
        /////////////////////////////////

        let val = await session.read({ nodeId: "ns=4;s=opcContatore" })
        console.log(val.value.toString());

        let nodeToWrite = {
            nodeId: "ns=4;s=opcContatore",
            attributeIds: opcua.AttributeIds.Value,
            value: /* DataValue */ {
                sourceTimestamp: new Date(),
                statusCode: opcua.StatusCodes.Good,// <==== 
                value: /* Variant */ {
                    dataType: opcua.DataType.Int32,
                    value: 25
                }
            },
        }
        let risultato = await session.write(nodeToWrite);
        console.log(risultato.toString());

        val = await session.read({ nodeId: "ns=4;s=opcContatore" })
        console.log(val.value.toString())
        ////////////////////////////////


        // step 4' : read a variable with read
        //To read a specific VariableType node
        /*  const maxAge = 0;
          const nodeToRead = {
              nodeId: nodeIds[i],
              attributeId: AttributeIds.Value
          };
          const dataValue = await session.read(nodeToRead, maxAge);
          console.log(" value ", dataValue.toString());*/

        // step 5: install a subscription and install a monitored item for 10 seconds
        //OPC-UA allows for subscriptions to it's objects instead of polling for changes.
        const subscription = ClientSubscription.create(session, {
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            maxNotificationsPerPublish: 100,
            publishingEnabled: true,
            priority: 10
        });

        subscription.on("started", function () {
            console.log("L110 subscription started for 2 seconds - subscriptionId=", subscription.subscriptionId);
        }).on("keepalive", function () {
            console.log("keepalive");
        }).on("terminated", function () {
            console.log("terminated");
        });


        // install monitored item

        // install monitored items
        //For loop call myMonitoredItems function and initiallised each monitiored item
        for (var node = 0; node < nodeIds.length; node++) {
            //console.log(nodeIds[node]);
            myMonitoredItems(nodeIds[node], subscription);
        }

        console.log("\n'-------------------------------------'\n\n");
        //console.log('MonitoredItems L128', MonitoredItems[0]);


        for (var i = 0; i < MonitoredItems.length; i++) {

            // publishing data from kafka producer 
            publishData(MonitoredItems[i], i, nodeIds);

        }


        //for terminatiing subscription
        /* 
        async function timeout(ms: number) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }
                await timeout(10000);
        
                console.log("now terminating subscription");
                await subscription.terminate();
                */



        // step 6: finding the nodeId of a node by Browse name
        const browsePath = makeBrowsePath("RootFolder", "/Objects/Server.ServerStatus.BuildInfo.ProductName");

        const result = await session.translateBrowsePath(browsePath);
        const productNameNodeId = result.targets[0].targetId;
        console.log(" Product Name nodeId L157= ", productNameNodeId.toString(), '\n');

        // close session
        //await session.close();

        // disconnecting
        //await client.disconnect();
        //console.log("done !");
    } catch (err) {
        console.log("An error has occured L166: ", err);
    }
}
main();

// Utility functions

// add nodeids of ET200sp Processing Station I/O's
// takes an array and OPCUA nodeID
//returns nodeID array
function addingNodes(nodeIds, node) {
    return nodeIds.push(node);
}

// initiallised monitored items
// takes OPCUA nodeID
function myMonitoredItems(values, subscription) {
    console.log('\nFrom \"myMonitoredItems_L183\"', values);
    const itemToMonitor: ReadValueIdLike = {
        nodeId: values,
        attributeId: AttributeIds.Value
    };
    const parameters: MonitoringParametersOptions = {
        samplingInterval: 100,
        discardOldest: true,
        queueSize: 10
    };

    const monitoredItem = ClientMonitoredItem.create(
        subscription,
        itemToMonitor,
        parameters,
        TimestampsToReturn.Both
    );

    monitoredItem.on("changed", (dataValue: DataValue) => {
        console.log('L202: ', values.split(';')[1].split('=')[1], " value has changed : ", dataValue.value.toString());
    });//values.split(';')[1],
    // appends each monitored item object
    MonitoredItems.push(monitoredItem);
    //console.log(MonitoredItems);


}
// kafka producer function
function publishData(reading, i, nodeIds) {

    reading.on("changed", function (dataValue) {

        console.log('L215: ', nodeIds[i].split(';')[1].split('=')[1] + " = ", dataValue.value.value, '\n');

        var measurement = {
            name: IOs[i],
            NodeID: nodeIds[i],
            measured_value: dataValue.value.value

        };
        producer.send([
            {
                topic: topicName, // kafka topic

                messages: [JSON.stringify(measurement)] // JSON object in string
            }], function (err, data) {
                if (err) { console.log('L229 Error sending: ', err); }
                else { console.log('L230: ', nodeIds[i].split(';')[1].split('=')[1] + ' Successfully published: ' + new Date() + ', ' + JSON.stringify(measurement), '\n') }//+ JSON.stringify(data)
            });
    });

}
