const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const PAGE_ACCESS_TOKEN = 'EAAMMIEgswYQBO1EThsRdFqyhIMWRIFqZAd9vGtZCTHPs7DkkLk5pLHf9krlZBw8Kb18wMwV61rZA7b7TnKlfXRYqNDNuQ7mVfZBGMZBPblPWaX0f7O15THkXXyMXAj8EYb91esKIZAUXvpr5ZAMNnUKZAOZBlMz6ZCxf5kkPfhEyeXZBkDnja2FMC81ZCPlrheKAI6fYPWVPrgACkCgZDZD';
const VERIFY_TOKEN = 'pageai';

app.use(bodyParser.json());

// Verify the webhook
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Handle messages and postbacks
app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;

            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

function handleMessage(sender_psid, received_message) {
    let response;

    if (received_message.text) {
        let messageText = received_message.text.toLowerCase();
        if (messageText === 'hi' || messageText === 'hello') {
            response = { "text": "Hello! How can I assist you today?" };
        } else if (messageText === 'help') {
            response = { "text": "Here are some commands you can use: hi, hello, help." };
        } else {
            response = { "text": `You sent the message: "${received_message.text}". Now send me an image!` };
        }
    } else if (received_message.attachments) {
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        };
    }

    callSendAPI(sender_psid, response);
}

function handlePostback(sender_psid, received_postback) {
    let response;

    let payload = received_postback.payload;

    if (payload === 'yes') {
        response = { "text": "Thanks!" };
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another image." };
    }

    callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    request({
        "uri": "https://graph.facebook.com/v12.0/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('Message sent!');
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

app.listen(process.env.PORT || 1337, () => console.log('Webhook is listening'));