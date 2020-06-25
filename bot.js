const {
  prefix,
  token,
  gamedigConfig,
  gamedigPotConfig,
  gamedigMineConfig,
  channels,
} = require("./botconfig.json");
const Discord = require("discord.js");
const Gamedig = require("gamedig");
const bot = new Discord.Client({ disableEveryone: true });

let appstatus = true;
const APPLICATION_CHANNEL = channels.APPLICATION;
const TEXT_CHANNEL = channels.TEXT;
const VOICE_CHANNEL = channels.VOICE;
const MINE_TEXT_CHANNEL = channels.MINETEXT;
const MINE_VOICE_CHANNEL = channels.MINEVOICE;
const POT_TEXT_CHANNEL = channels.POTTEXT;
const POT_VOICE_CHANNEL = channels.POTVOICE;

const DEFAULT_UPDATE_INTERVAL = 30000; // Thirty seconds

//Message codes for the bot functions
const MESSAGE_CODES = {
  PLAYERS: "tttplayers",
  POTPLAYERS: "potplayers",
  INVITE: "ttt",
  POTINVITE: "pot",
  MINEINVITE: "minecraft",
  BOT_INFO: "botinfo",
  //APPLY: "apply",
  CHANGE_APPLICATION: "apps",
  HELP: "help",
  JACKINVITE: "jackbox",
  HALOINVITE: "halo",
  SCRIBBLIOINVITE: "skribbl.io",
  L4D2INVITE: "l4d2",
  ROLE: "role",
};

const POT_STEAM_SERVER_LINK = "steam://connect/192.223.27.68:27015";
const STEAM_SERVER_LINK = "steam://connect/66.151.244.2:27015";
const STARTUP_MESSAGE_PLAYERS_KEY = "**ONLINE PLAYERS**";
const STARTUP_MESSAGE =
  `
***Click this link to open up Garry's Mod and connect to the server!***
------------- ***` +
  STEAM_SERVER_LINK +
  `*** ---------------
--------------------------` +
  STARTUP_MESSAGE_PLAYERS_KEY +
  `---------------------------`;
const POT_STARTUP_MESSAGE =
  `
***Click this link to open up Garry's Mod and connect to the server!***
------------- ***` +
  POT_STEAM_SERVER_LINK +
  `*** ---------------
--------------------------` +
  STARTUP_MESSAGE_PLAYERS_KEY +
  `---------------------------`;

const MINE_STARTUP_MESSAGE =
  `
***Join our Minecraft server!***
------------- ***` +
  POT_STEAM_SERVER_LINK +
  `*** ---------------
--------------------------` +
  STARTUP_MESSAGE_PLAYERS_KEY +
  `---------------------------`;

// Handle potential uncaught errors resulting from dependencies.
process.on("unhandledRejection", function (err, promise) {
  // ignore improperly-chained promise rejections from Sequential.js
  if (err.stack.includes("Sequential.js:79:15")) {
    return;
  }
  console.error(
    "Unhandled rejection (promise: ",
    promise,
    ", reason: ",
    err,
    ")."
  );
});

bot.on("error", console.error);

// handles all queries to gamedig
const handleGamedigQuery = () =>
  new Promise((resolve) => {
    return Gamedig.query(gamedigConfig)
      .then(resolve)
      .catch((error) => {
        console.log("TTT Server is offline");
      });
  });

// handle potpourri querry to gamedig
const handlePotGamedigQuery = () => {
  return new Promise((resolve) => {
    Gamedig.query(gamedigPotConfig)
      .then(resolve)
      .catch((error) => {
        console.log("Potpourri Server is offline");
      });
  });
};

// handle minecraft querry to gamedig
const handleMineGamedigQuery = () => {
  return new Promise((resolve) => {
    Gamedig.query(gamedigMineConfig)
      .then(resolve)
      .catch((error) => {
        console.log("Minecraft Server is offline");
      });
  });
};

//Function called every 30000 ms to update the "game" played by the bot
const activityupdate = () =>
  handleGamedigQuery().then((state) => {
    //var status = state.players.length + " in " + state.map;
    bot.user.setActivity("!help", { type: "PLAYING" });
    console.log("Bot activity status updated!");
  });

// Will return a list of all active players by-name joined by the specified delimiter
const getActivePlayers = (delimiter = ", \n") =>
  handleGamedigQuery()
    .then((state) => {
      return Promise.resolve(
        state.players.length
          ? state.players.map((ply) => ply.name).join(delimiter)
          : ""
      );
    })
    .catch(console.error);

// Will return potpourri's players by name.
const getPotActivePlayers = (delimiter = ", \n") =>
  handlePotGamedigQuery()
    .then((state) => {
      return Promise.resolve(
        state.players.length
          ? state.players.map((ply) => ply.name).join(delimiter)
          : ""
      );
    })
    .catch(console.error);

const getMineActivePlayers = (delimiter = ", \n") =>
  handleMineGamedigQuery()
    .then((state) => {
      console.log(state.players);
      return Promise.resolve(
        state.players.length
          ? state.players.map((ply) => ply.name).join(delimiter)
          : ""
      );
    })
    .catch(console.error);

//Function called every 30000 ms to update the title of the voice channel with the server status
const voicechannelupdate = () =>
  //Server status query
  handleGamedigQuery()
    .then((state) => {
      var status = state.players.length + " in " + state.map;
      let statuschannel = bot.channels.get(VOICE_CHANNEL);
      statuschannel.setName(status);
      console.log("TTT status updated!");
      Promise.resolve();
    })
    .catch(console.error);

//Function called every 30000 ms to update the title of the voice channel with the POTPOURRI server status
const potvoicechannelupdate = () =>
  //Server status query
  handlePotGamedigQuery()
    .then((state) => {
      var status = state.players.length + " in " + state.map;
      let statuschannel = bot.channels.get(POT_VOICE_CHANNEL);
      statuschannel.setName(status);
      console.log("Potpourri status updated!");
      Promise.resolve();
    })
    .catch(console.error);

//Function called every 30000 ms to update the title of the voice channel with the POTPOURRI server status
const minevoicechannelupdate = () =>
  //Server status query
  handleMineGamedigQuery()
    .then((state) => {
      var status = state.players.length + " playing Minecraft";
      let statuschannel = bot.channels.get(MINE_VOICE_CHANNEL);
      statuschannel.setName(status);
      console.log("Minecraft status updated!");
      Promise.resolve();
    })
    .catch(console.error);

//Function called every 30000ms to update the playerlist in the player list channel
const textchannelupdate = (message, channel) =>
  getActivePlayers()
    .then((players) => {
      return channel.fetchMessages().then((messages) => {
        players = players.length
          ? players
          : "----***There are no players online right now, be the first to join!***----";

        // Ensure we obtain the first message sent with the startup-message
        let sortedMessages = [...messages]
          .sort((fm, sm) => fm[0] - sm[0])
          .map((msg) => msg[1])
          .filter(
            ({ author, content }) =>
              content.includes(STARTUP_MESSAGE_PLAYERS_KEY) && author.bot
          );

        let lastMessage = sortedMessages[sortedMessages.length - 1];

        // If the startup message is not in the list, send the message. Otherwise edit it.
        return !lastMessage
          ? channel.send(message + "\n" + players)
          : lastMessage.edit(STARTUP_MESSAGE + "\n" + players);
      });
    })
    .catch(console.error);

//Function called every 30000ms to update the POTPOURRI playerlist in the POT player list channel
const pottextchannelupdate = (message, channel) =>
  getPotActivePlayers()
    .then((players) => {
      return channel.fetchMessages().then((messages) => {
        players = players.length
          ? players
          : "----***There are no players online right now, be the first to join!***----";

        // Ensure we obtain the first message sent with the startup-message
        let sortedMessages = [...messages]
          .sort((fm, sm) => fm[0] - sm[0])
          .map((msg) => msg[1])
          .filter(
            ({ author, content }) =>
              content.includes(STARTUP_MESSAGE_PLAYERS_KEY) && author.bot
          );

        let lastMessage = sortedMessages[sortedMessages.length - 1];

        // If the startup message is not in the list, send the message. Otherwise edit it.
        return !lastMessage
          ? channel.send(message + "\n" + players)
          : lastMessage.edit(POT_STARTUP_MESSAGE + "\n" + players);
      });
    })
    .catch(console.error);

const minetextchannelupdate = (message, channel) =>
  getMineActivePlayers()
    .then((players) => {
      return channel.fetchMessages().then((messages) => {
        players = players.length
          ? players
          : "----***There are no players online right now, be the first to join!***----";

        // Ensure we obtain the first message sent with the startup-message
        let sortedMessages = [...messages]
          .sort((fm, sm) => fm[0] - sm[0])
          .map((msg) => msg[1])
          .filter(
            ({ author, content }) =>
              content.includes(STARTUP_MESSAGE_PLAYERS_KEY) && author.bot
          );

        let lastMessage = sortedMessages[sortedMessages.length - 1];

        // If the startup message is not in the list, send the message. Otherwise edit it.
        return !lastMessage
          ? channel.send(message + "\n" + players)
          : lastMessage.edit(MINE_STARTUP_MESSAGE + "\n" + players);
      });
    })
    .catch(console.error);

//List of commands that can be called to the bot
const handleMessage = (message) => {
  if (
    message === undefined || // Message must exist
    message.author.bot || // Message must not be from the bot
    message.channel.type === "dm" || // message must not be a dm
    message.content[0] !== prefix // Message must contain the assumed prefix
  )
    return;

  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);

  // Allow l/u-case commands. Return an error if the command is invalid
  if (
    !Object.values(MESSAGE_CODES)
      .map((code) => prefix + code.toLowerCase())
      .find((code) => code === cmd.toLowerCase())
  ) {
    console.log("Sorry! We didn't recognize that command.");
    //message.channel.send("Sorry! We didn't recognize that command.");
  }

  //bot command that returns bot info
  if (cmd === `${prefix}${MESSAGE_CODES.BOT_INFO}`) {
    message.channel.send(
      "I was made by Bonzo and John, for the DMG Discord server!"
    );
  }

  //bot command to invite people to play some jackbox 8)
  if (cmd === `${prefix}${MESSAGE_CODES.JACKINVITE}`) {
    message.channel.send(
      "<@&657006035705397295> \n" + "Time to play some Jackbox!"
    );
  }

  // bot command to invite people to play some halo 8)
  if (cmd === `${prefix}${MESSAGE_CODES.HALOINVITE}`) {
    message.channel.send(
      "<@&660591794882478112> \n" + "Time to play some Halo!"
    );
  }

  // bot command to invite people to play some scribblio 8)
  if (cmd === `${prefix}${MESSAGE_CODES.SCRIBBLIOINVITE}`) {
    message.channel.send(
      "<@&682652516336533568> \n" + "Time to play some Skribbl.io!"
    );
  }

  // bot command to invite people to play some left4dead 8)
  if (cmd === `${prefix}${MESSAGE_CODES.L4D2INVITE}`) {
    message.channel.send(
      "<@&693672686114701320> \n" + "Time to play some Left 4 Dead 2!"
    );
  }

  // bot command to invite people to play some halo 8)
  if (cmd === `${prefix}${MESSAGE_CODES.MINEINVITE}`) {
    message.channel.send(
      "<@&725494456563925053> \n" + "Time to play some Minecraft!"
    );
  }

  //bot command that returns amount of online players and map being played
  if (cmd === `${prefix}${MESSAGE_CODES.INVITE}`) {
    handleGamedigQuery()
      .then((state) => {
        message.channel.send(
          "<@&644704497150590997> \n" +
            "The server has " +
            state.players.length +
            " players on right now.\n" +
            "The server is on the map " +
            state.map +
            " right now.\n" +
            "Come join us! " +
            STEAM_SERVER_LINK
        );
        return Promise.resolve();
      })
      .catch(console.error);
  }

  //Command to DM player list of bot commands
  if (cmd === `${prefix}${MESSAGE_CODES.HELP}`) {
    message.author
      .send(`The server status is displayed throught the voice and text channels in the servers section of the discord.
The current map and player count is displayed in the respective voice channel, while the player names and a direct invite link is shown in the text channel.
    
Here's the list of commands for the server!    

***!ttt:*** Announces current player count and map in the TTT server, along with a direct invite link.
***!pot:*** Announces current player count and map in the Potpourri server, along with a direct invite link.
***!apply <reason>:*** Use this command to apply for a staff position. Replace <reason> with your own reason for joining the staff team. Follow my commands to send your application. (Detectives only!)
***!tttplayers:*** DM's you the list of the current TTT players.
***!potplayers:*** DM's you the list of the current Potpourri players.
***!help:*** DM's you this help message again.
***!apps:*** Enable or disable the !apply command (Community Managers only!) 
***!botinfo:*** Display the credits.
***!role <game>:*** Gives you the invite role for that specific game. The list is up ahead.
***!ttt:*** Announces current player count and map in the TTT server, along with a direct invite link.
***!pot:*** Announces current player count and map in the Potpourri server, along with a direct invite link.
***!jackbox:*** Invite people to play Jackbox
***!halo:*** Invite people to play Halo
***!skribbl.io:*** Invite people to play Skribbl.io
***!l4d2:*** Invite people to play L4D2
`);
  }

  //Command for Potpourri invite
  if (cmd === `${prefix}${MESSAGE_CODES.POTINVITE}`) {
    handlePotGamedigQuery()
      .then((state) => {
        message.channel.send(
          "<@&707340676186243104> \n" +
            "The server has " +
            state.players.length +
            " players on right now.\n" +
            "The server is on the map " +
            state.map +
            " right now.\n" +
            "Come join us! " +
            POT_STEAM_SERVER_LINK
        );
        return Promise.resolve();
      })
      .catch(console.error);
  }

  //Bot command to assign roles
  if (cmd === `${prefix}${MESSAGE_CODES.ROLE}`) {
    let user = message.member;
    switch (args[0]) {
      case "ttt":
        let isTTT = user.roles.find((r) => r.name === "TTT Time"); //check if user has ttt time role

        if (!isTTT) {
          user.addRole("644704497150590997").then(() => {
            console.log("TTT Time role successfully added to " + user.nickname);
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !ttt command. You can disable this anytime by using the !role ttt command again!"
            );
          });
        } else {
          user.removeRole("644704497150590997").then(() => {
            console.log("TTT Time role successfully added to " + user.nickname);
            message.channel.send(
              "Alright, I have removed the TTT Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      case "jackbox":
        let isJack = user.roles.find((r) => r.name === "Jackbox Time"); //check if user has jackbox time role

        if (!isJack) {
          user.addRole("657006035705397295").then(() => {
            console.log(
              "Jackbox Time role successfully added to " + user.nickname
            );
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !jackbox command. You can disable this anytime by using the !role jackbox command again!"
            );
          });
        } else {
          user.removeRole("657006035705397295").then(() => {
            console.log(
              "Jackbox Time role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the Jackbox Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      case "skribbl.io":
        let isScrib = user.roles.find((r) => r.name === "Skribbl.io Time"); //check if user has jackbox time role

        if (!isScrib) {
          user.addRole("682652516336533568").then(() => {
            console.log(
              "Jackbox Time role successfully added to " + user.nickname
            );
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !skribbl.io command. You can disable this anytime by using the !role scribbl.io command again!"
            );
          });
        } else {
          user.removeRole("682652516336533568").then(() => {
            console.log(
              "Jackbox Time role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the Scribbl.io Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      case "halo":
        let isHalo = user.roles.find((r) => r.name === "Halo Time"); //check if user has halo time role

        if (!isHalo) {
          user.addRole("660591794882478112").then(() => {
            console.log(
              "Halo Time role successfully added to " + user.nickname
            );
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !halo command. You can disable this anytime by using the !role halo command again!"
            );
          });
        } else {
          user.removeRole("660591794882478112").then(() => {
            console.log(
              "Halo Time role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the Halo Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      case "l4d2":
        let isLeft = user.roles.find((r) => r.name === "L4D2 Time"); //check if user has l4d2 time role

        if (!isLeft) {
          user.addRole("693672686114701320").then(() => {
            console.log(
              "L4D2 Time role successfully added to " + user.nickname
            );
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !l4d2 command. You can disable this anytime by using the !role l4d2 command again!"
            );
          });
        } else {
          user.removeRole("693672686114701320").then(() => {
            console.log(
              "L4D2 Time role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the L4D2 Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      case "pot":
        let isPot = user.roles.find((r) => r.name === "Potpourri Time"); //check if user has pot time role

        if (!isPot) {
          user.addRole("707340676186243104").then(() => {
            console.log("Pot Time role successfully added to " + user.nickname);
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !pot command. You can disable this anytime by using the !role pot command again!"
            );
          });
        } else {
          user.removeRole("707340676186243104").then(() => {
            console.log(
              "Pot Time role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the Potpourri Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      case "island":
        let isIsland = user.roles.find((r) => r.name === "Island Dweller"); //check if user has island dweller role

        if (!isIsland) {
          user.addRole("692795722831233131").then(() => {
            console.log(
              "Island Dweller role successfully added to " + user.nickname
            );
            message.channel.send("You're all set!");
          });
        } else {
          user.removeRole("692795722831233131").then(() => {
            console.log(
              "Island Dweller role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the Island Dweller role from you."
            );
          });
        }
        break;
      case "minecraft":
        let isMine = user.roles.find((r) => r.name === "Minecraft Time"); //check if user has jackbox time role

        if (!isMine) {
          user.addRole("725494456563925053").then(() => {
            console.log(
              "Minecraft Time role successfully added to " + user.nickname
            );
            message.channel.send(
              "You're all set! You will now be mentioned whenever someones uses the !minecraft command. You can disable this anytime by using the !role minecraft command again!"
            );
          });
        } else {
          user.removeRole("725494456563925053").then(() => {
            console.log(
              "Minecraft Time role successfully removed from " + user.nickname
            );
            message.channel.send(
              "Alright, I have removed the Minecraft Time role from you. You won't be mentioned again."
            );
          });
        }
        break;
      default:
        message.channel.send(
          "I don't recognize that game, please check what you wrote and try again!"
        );
    }
  }

  //bot command that changes the status for recieving applications
  if (cmd === `${prefix}${MESSAGE_CODES.CHANGE_APPLICATION}`) {
    let isCM = message.member.roles.find((r) => r.name === "Community Manager"); //user using !apps must be community manager
    if (!isCM) {
      message.channel.send("Permission denied!");
      return;
    }
    appstatus = !appstatus;
    if (appstatus) {
      message.channel.send(
        "Settings updated! We are now recieving applications."
      );
    } else {
      message.channel.send(
        "Settings updated! We are currently not recieving applications."
      );
    }
  }

  //bot command that returns the names of every online player
  if (cmd === `${prefix}${MESSAGE_CODES.PLAYERS}`) {
    getActivePlayers().then((players) => {
      message.author.send(
        "Player List: " + (players.length ? players : "No online players.")
      );
      message.channel.send("Check your DM's for a list of online players!");
    });
  }

  //bot command that returns the names of every online player
  if (cmd === `${prefix}${MESSAGE_CODES.POTPLAYERS}`) {
    getPotActivePlayers().then((players) => {
      message.author.send(
        "Player List: " + (players.length ? players : "No online players.")
      );
      message.channel.send("Check your DM's for a list of online players!");
    });
  }

  //bot command that lets a user apply to be a part of the staff team

  if (cmd === `${prefix}${MESSAGE_CODES.APPLY}`) {
    //!apply hey this is why im applying hahalmao
    let aUser = message.author.username; //gets applicant's username
    let isDetective = message.member.roles.find((r) => r.name === "Detective"); //applying user must be detective
    let aMessage = args.join(" ");

    if (!appstatus) {
      message.channel.send(
        "Permission denied! We are currently not recieving applications."
      );
      return;
    }
    if (!isDetective) {
      message.channel.send(
        "Permission denied! Only detectives can apply to be staff!"
      );
      return;
    } else {
      message.reply(
        "Thanks for your application! You must add a reason for it, type it now in the channel you first typed !apply on."
      );

      const collector = new Discord.MessageCollector(
        message.channel,
        (m) => m.author.id === message.author.id,
        { time: 60000 }
      );
      console.log(collector);
      collector.on("collect", (message) => {
        if (message.content.length <= 10) {
          message.reply(
            "Your application message should be longer than 10 characters! Try again."
          );
        } else {
          message.reply(
            "Are you sure you want that to be your application message? Confirm or deny with the reactions!"
          );
          message.react("👍").then(() => message.react("👎"));

          const filter = (reaction, user) => {
            return (
              ["👍", "👎"].includes(reaction.emoji.name) &&
              user.id === message.author.id
            );
          };

          message
            .awaitReactions(filter, { max: 1, time: 60000, errors: ["time"] })
            .then((collected) => {
              const reaction = collected.first();

              if (reaction.emoji.name === "👍") {
                aMessage = message;
                let applicationEmbed = new Discord.RichEmbed()
                  .setColor("#3fc627")
                  .addField(
                    `${aUser} has applied to be a DMG staff member!`,
                    `Application message: ${aMessage}`
                  )
                  .setDescription("Vote with reactions!");

                //message.delete().catch(O_o => {console.log("Failed to delete message!")});
                bot.channels
                  .get(APPLICATION_CHANNEL)
                  .send(applicationEmbed)
                  .then((embedMessage) => {
                    embedMessage
                      .react("👍")
                      .then(() => embedMessage.react("👎"));
                  })
                  .catch(() =>
                    console.error("One of the emojis failed to react.")
                  );
                message.reply(
                  "Thanks! I will send your application to the staff team! Give us a week to look over it and we will get back to you!"
                );
              } else {
                message.reply(
                  "Oh, OK! You can try again any time with !apply."
                );
              }
            })
            .catch((collected) => {
              message.reply(
                "You didn't react with neither a thumbs up, nor a thumbs down. Try again!"
              );
            });
        }
      });
      return;
    }
  }
};

// Create a function-wrapper for the interval function to avoid duplicity.
// We also want to call it once on startup.
const updateTextChannel = () =>
  textchannelupdate(STARTUP_MESSAGE, bot.channels.get(TEXT_CHANNEL));
const updatePotTextChannel = () =>
  pottextchannelupdate(POT_STARTUP_MESSAGE, bot.channels.get(POT_TEXT_CHANNEL));

//Sets the "game" being played by the bot every 30 seconds
bot.on("ready", () => {
  console.log(`${bot.user.username} is online!`);
  console.log("I am ready!");

  bot.setInterval(activityupdate, DEFAULT_UPDATE_INTERVAL);
  bot.setInterval(voicechannelupdate, DEFAULT_UPDATE_INTERVAL);
  bot.setInterval(potvoicechannelupdate, DEFAULT_UPDATE_INTERVAL);
  bot.setInterval(minevoicechannelupdate, DEFAULT_UPDATE_INTERVAL);

  // After we send the first text-status message, set the loop.
  updateTextChannel().then(() => {
    bot.setInterval(updateTextChannel, DEFAULT_UPDATE_INTERVAL);
  });
  updatePotTextChannel().then(() => {
    bot.setInterval(updatePotTextChannel, DEFAULT_UPDATE_INTERVAL);
  });
});

// Handle messages
bot.on("message", handleMessage);

// Login using the bot.
bot.login(token ? token : process.env.BOT_TOKEN); //BOT_TOKEN is the Client Secret
