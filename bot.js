const { prefix, gamedigConfig } = require("./botconfig.json");
const Discord = require("discord.js");
const Gamedig = require('gamedig');
const bot = new Discord.Client({disableEveryone: true});

const TEXT_CHANNEL = "573022289931796511";
const VOICE_CHANNEL = "573022265416089603";

bot.on("error", console.error);

// Handle potential uncaught errors resulting from dependencies.
process.on("unhandledRejection", function(err, promise) {
    console.error("Unhandled rejection (promise: ", promise, ", reason: ", err, ").");
});

const MESSAGE_CODES = {
  "PLAYERS": "players",
  "INVITE": "invite",
  "BOT_INFO": "botinfo"
};

const handleGamedigQuery = () => new Promise((resolve) => {
  return Gamedig.query(gamedigConfig)
    .then(resolve)
    .catch((error) => { console.log("Server is offline"); })
});

//Function called every 30000 ms to update the "game" played by the bot
function update() {

    //Server status query
    handleGamedigQuery().then((state) => {
        var status = state.players.length + " of " + state.maxplayers + " in map " + state.map;
        bot.user.setActivity(status, { type: 'PLAYING' });
        console.log("Status updated!");
        Promise.resolve();
    }).catch(console.error);
};

//Function called every 30000 ms to update the title of the voice channel with the server status
function voicechannelupdate(){

    //Server status query
    handleGamedigQuery().then((state) => {
        var status = state.players.length + " in " + state.map;
        let statuschannel = bot.channels.get(VOICE_CHANNEL);
        statuschannel.setName(status);
        console.log("Status updated!");
        Promise.resolve();
    }).catch(console.error);
};

function textchannelupdate(){
    //Server status query
    handleGamedigQuery().then((state) => {
      var i = 0;
      playerlist = ""
      playerArray = state.players;
      console.log("getting players...")
      if (playerArray.length == 0) {
          playerlist = "The server is empty right now!";
      }
      while (i < playerArray.length) {
          playerlist = playerlist + playerArray[i].name + ``;
          i++;
      }
      let statuschannel = bot.channels.get(TEXT_CHANNEL);
      console.log("Status updated!")

      return statuschannel.fetchMessages({ limit: 1 })
        .then((messages) => {
          let lastMessage = messages.first();
          console.log("fetchin messages...")
          if (!lastMessage.author.bot) {
          console.log("last message's author is not a bot!")
          }
          return lastMessage.edit(`${playerlist}`)
          })
        .then((msg) => console.log(`New message content: ${msg}`));

    }).catch(console.error);
}

//Sets the "game" being played by the bot every 30 seconds
bot.on("ready", async function(message) {
    console.log(`${bot.user.username} is online!`);
    console.log("I am ready!");
    bot.setInterval(update,30000);
    bot.setInterval(voicechannelupdate,30000);
    statuschat = bot.channels.get(TEXT_CHANNEL);
    statuschat.send("***Click this link to open up Garry's Mod and connect to the server!***");
    statuschat.send(`steam://connect/66.151.244.2:27015`);
    statuschat.send(".");
    statuschat.send("--------------------------**ONLINE PLAYERS**--------------------------");
    statuschat.send("Initializing...");
    bot.setInterval(textchannelupdate,30000);
});

//List of commands that can be called to the bot

const handleMessage = (message) => {

    if (message === undefined) return;
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;
    if (message.content[0] !== prefix) return;

    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    // let args = messageArray.slice(1);

    // Allow l/u-case commands. Return an error if the command is invalid
    if (!Object.values(MESSAGE_CODES).map((code) => prefix + code.toLowerCase()).find((code) => code === cmd.toLowerCase())) {
      message.channel.send("Sorry! We didn't recognize that command.");
    };

    //bot command that returns bot info
    if (cmd === `${prefix}${MESSAGE_CODES.BOT_INFO}`){
        message.channel.send("I was made by Bonzo, for the DMG Discord server!");
    }

    //bot command that returns amount of online players and map being played
    if (cmd === `${prefix}${MESSAGE_CODES.INVITE}`){
        handleGamedigQuery().then((state) => {
            message.channel.send(`The server has ${state.players.length} players on right now.`);
            message.channel.send(`The server is on the map ${state.map} right now.`);
            message.channel.send(`Come join us! steam://connect/66.151.244.2:27015`);
        }).catch(console.error);
    }

    //bot command that returns the names of every online player
    if (cmd === `${prefix}${MESSAGE_CODES.PLAYERS}`){
        handleGamedigQuery().then((state) => {
            var i = 0;
            var playerlist = "";
            playerArray = state.players;
            while (i < playerArray.length) {
                playerlist = playerlist + playerArray[i].name + ", ";
                i++;
            }
            message.author.send (playerlist);
            message.channel.send ("Check your DM's for a list of online players!");
        }).catch(console.error);
    }
};


bot.on("message", async function(message) { return handleMessage(message); });


bot.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
