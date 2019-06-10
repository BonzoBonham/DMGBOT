const { prefix, token, gamedigConfig, channels } = require("./botconfig.json");
const Discord = require("discord.js");
const Gamedig = require('gamedig');
const fs = require('fs');
const bot = new Discord.Client({disableEveryone: true});

let appstatus = true;
const TEXT_CHANNEL =  channels.TEXT;
const VOICE_CHANNEL = channels.VOICE;
const APPLICATION_CHANNEL = channels.APPLICATION;

const DEFAULT_UPDATE_INTERVAL = 30000; // Thirty seconds

//Message codes for the bot functions
const MESSAGE_CODES = {
    "PLAYERS": "players",
    "INVITE": "invite",
    "BOT_INFO": "botinfo",
    "APPLY": "apply",
    "CHANGE_APPLICATION": "apps" 
  };

const STEAM_SERVER_LINK = "steam://connect/66.151.244.2:27015";
const STARTUP_MESSAGE_PLAYERS_KEY = "**ONLINE PLAYERS**";
const STARTUP_MESSAGE = `
***Click this link to open up Garry's Mod and connect to the server!***
------------- ***` + STEAM_SERVER_LINK + `*** ---------------
--------------------------` + STARTUP_MESSAGE_PLAYERS_KEY + `---------------------------`;

// Handle potential uncaught errors resulting from dependencies.
process.on("unhandledRejection", function(err, promise) {
    // ignore improperly-chained promise rejections from Sequential.js
    if (err.stack.includes("Sequential.js:79:15")) {
      return;
    }
    console.error("Unhandled rejection (promise: ", promise, ", reason: ", err, ").");
});

bot.on("error", console.error);

// handles all queries to gamedig
const handleGamedigQuery = () =>
  new Promise((resolve) => {
    return Gamedig.query(gamedigConfig)
      .then(resolve)
      .catch((error) => { console.log("Server is offline"); })
  });

//Function called every 30000 ms to update the "game" played by the bot
const activityupdate = () =>
    handleGamedigQuery().then((state) => {

        var status = state.players.length + " in " + state.map;
        bot.user.setActivity(status, { type: 'PLAYING' })
        console.log("Bot activity status updated!")
    });

// Will return a list of all active players by-name joined by the specified delimiter
const getActivePlayers = (delimiter = ", \n") =>
  handleGamedigQuery().then((state) => {
      return Promise.resolve(state.players.length ? state.players.map((ply) => ply.name).join(delimiter) : "");
  }).catch(console.error);

//Function called every 30000 ms to update the title of the voice channel with the server status
const voicechannelupdate = () =>
    //Server status query
    handleGamedigQuery().then((state) => {
        var status = state.players.length + " in " + state.map;
        let statuschannel = bot.channels.get(VOICE_CHANNEL);
        statuschannel.setName(status);
        console.log("Status updated!");
        Promise.resolve();
    }).catch(console.error);

//Function called every 30000ms to update the playerlist in the player list channel
const textchannelupdate = (message, channel) =>
  getActivePlayers()
    .then((players) => {

      return channel.fetchMessages().then((messages) => {

          players = (players.length ? players : "----***There are no players online right now, be the first to join!***----");

          // Ensure we obtain the first message sent with the startup-message
          let sortedMessages = [...messages].sort((fm, sm) => fm[0] - sm[0]).map((msg) => msg[1])
            .filter(({author, content}) => content.includes(STARTUP_MESSAGE_PLAYERS_KEY) && author.bot)

          let lastMessage =  sortedMessages[sortedMessages.length - 1];

          // If the startup message is not in the list, send the message. Otherwise edit it.
          return (!lastMessage)
            ? channel.send(message + "\n" + players)
            : lastMessage.edit(STARTUP_MESSAGE + "\n" + players)
        });

    }).catch(console.error);

//List of commands that can be called to the bot
const handleMessage = (message) => {

    if (message === undefined // Message must exist
      || message.author.bot // Message must not be from the bot
      || message.channel.type === "dm" // message must not be a dm
      || message.content[0] !== prefix) // Message must contain the assumed prefix
       return;

    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    // Allow l/u-case commands. Return an error if the command is invalid
    if (!Object.values(MESSAGE_CODES).map((code) => prefix + code.toLowerCase()).find((code) => code === cmd.toLowerCase())) {
      console.log("Sorry! We didn't recognize that command.");
      //message.channel.send("Sorry! We didn't recognize that command.");
    };

    //bot command that returns bot info
    if (cmd === `${prefix}${MESSAGE_CODES.BOT_INFO}`){
        message.channel.send("I was made by Bonzo and John, for the DMG Discord server!");
    }

    //bot command that returns amount of online players and map being played
    if (cmd === `${prefix}${MESSAGE_CODES.INVITE}`){
        handleGamedigQuery().then((state) => {
            message.channel.send("The server has " + state.players.length + " players on right now.\n"
            + "The server is on the map " + state.map + " right now.\n"
            + "Come join us! " + STEAM_SERVER_LINK);
            return Promise.resolve();
        }).catch(console.error);
    }

    //bot command that changes the status for recieving applications
    if (cmd === `${prefix}${MESSAGE_CODES.CHANGE_APPLICATION}`){
      let isCM = message.member.roles.find(r => r.name === "Community Manager"); //user using !apps must be community manager
      if (!isCM){
        message.channel.send ("Permission denied!");
        return;
      }
      appstatus = !appstatus;
      if(appstatus){
        message.channel.send("Settings updated! We are now recieving applications.");
      } else {
        message.channel.send("Settings updated! We are currently not recieving applications.");
      }
    }

    //bot command that returns the names of every online player
    if (cmd === `${prefix}${MESSAGE_CODES.PLAYERS}`){
      getActivePlayers()
        .then((players) => {
          message.author.send("Player List: " + (players.length ? players : "No online players."))
          message.channel.send ("Check your DM's for a list of online players!");
        })
    }

    //bot command that lets a user apply to be a part of the staff team
    if (cmd === `${prefix}${MESSAGE_CODES.APPLY}`){
      //!apply hey this is why im applying hahalmao
      let aUser = message.author.username; //gets applicant's username
      let isDetective = message.member.roles.find(r => r.name === "Detective"); //applying user must be detective
      let aMessage = args.join(" ");

      if (!appstatus){
        message.channel.send ("Permission denied! We are currently not recieving applications.");
        return;
      }
      if (!isDetective){
        message.channel.send ("Permission denied! Only detectives can apply to be staff!");
        return;
      } else {
        message.author.send ("Thanks for your application! You must add a reason for it, type it now!");

        const collector = new Discord.MessageCollector(message.author.dmChannel , m => m.author.id === message.author.id, { time: 10000 });
        console.log(collector)
        collector.on('collect', message => {
            if (message.content.length <= 10) {
                message.author.send("Your application message should be longer than 10 characters! Type !apply to try again.");
            } else {
                aMessage = message;
                let applicationEmbed = new Discord.RichEmbed()
                .setColor("#3fc627")
                .addField(`${aUser} has applied to be a DMG staff member!`, `Application message: ${aMessage}`)
                .setDescription("Vote with reactions!");

                message.delete().catch(O_o => {console.log("Failed to delete message!")});
                bot.channels.get(APPLICATION_CHANNEL).send(applicationEmbed)
                .then(embedMessage => {
                  embedMessage.react("👍").then(() => embedMessage.react('👎'))
                }).catch(() => console.error('One of the emojis failed to react.'));


                message.author.send("Thanks! I will send your application to the staff team! Give us a week to look over it and we will get back to you!");
            }
        })


     

        return;
      }
    }

};

// Create a function-wrapper for the interval function to avoid duplicity.
// We also want to call it once on startup.
const updateTextChannel = () => textchannelupdate(STARTUP_MESSAGE, bot.channels.get(TEXT_CHANNEL));

//Sets the "game" being played by the bot every 30 seconds
bot.on("ready", () => {
  console.log(`${bot.user.username} is online!`);
  console.log("I am ready!");

  bot.setInterval(activityupdate,DEFAULT_UPDATE_INTERVAL);
  bot.setInterval(voicechannelupdate,DEFAULT_UPDATE_INTERVAL);

  // After we send the first text-status message, set the loop.
  updateTextChannel()
    .then(() => { bot.setInterval(updateTextChannel,DEFAULT_UPDATE_INTERVAL); });

});

// Handle messages
bot.on("message", handleMessage);

// Login using the bot.
bot.login(token ? token : process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
