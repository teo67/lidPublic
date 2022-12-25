require('dotenv').config();

const Discord = require('discord.js');
const fs = require('fs/promises');
const Lex = require('./lex.js').Lex;
const Parser = require('./parsing.js');
const operators = require('./operators.js');
const values = require('./values.js');
const embed = require('./embed.js');
const splitEmbed = require('./splitEmbed.js');
const navigate = require('./navigate.js');

const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.MessageContent, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.GuildMessageReactions] });

client.once(Discord.Events.ClientReady, () => {
    console.log("lid is up and running!");
});

const writeDataToJSON = async (data, fileName) => {
    const asJson = JSON.stringify(data);
    await fs.writeFile(fileName + ".json", asJson);
}

client.on(Discord.Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.isChatInputCommand() || interaction.commandName != "lid") {
            return;
        }
        
        const text = interaction.options.getString("input");
        const outputFormat = interaction.options.getString("output-format") ?? "last-only";
        const outputTarget = interaction.options.getString("output-target") ?? "channel-message";
        await interaction.deferReply({ ephemeral: outputTarget == "ephemeral-message" });
        const lexer = new Lex(text);
        const parser = new Parser(lexer);
        let output;
        try {
            const expr = parser.parseExpressions();
            const result = operators.operatorArray[expr.num](expr.args);
            if(result.type != values.types.ARRAY) {
                throw "Improper formatting";
            }
            if(outputFormat == "none") {
                return;
            }
            switch(outputFormat) {
                case "first-only":
                    output = values.getString(result.val[0]);
                    break;
                case "last-only":
                    output = values.getString(result.val[result.val.length - 1]);
                    break;
                case "all":
                    output = "";
                    for(let i = 0; i < result.val.length; i++) {
                        const res = values.getString(result.val[i]);
                        if(res.length > 0) {
                            output += `Expression ${i}: ${res}\n`;
                        } else {
                            output += `No valid return value for expression ${i}`;
                        }
                    }
                    break;
                default:
                    output = "Error: invalid output format!";
            }
        } catch(e) {
            output = `There was an error parsing your code: \n${e}`;
        }

        if(output.length == 0) {
            output = " ";
        }
        
        const _embeds = splitEmbed(interaction.user, output, "Output", process.env.VERSION, client);
        if(outputTarget == "direct-message") {
            try {
                for(const _embed of _embeds) {
                    await interaction.user.send(_embed);
                }
            } catch {
                const errorEmbed = embed(interaction.user, "Error: unable to send direct message! Check your DM settings.", "Output", process.env.VERSION, client);
                errorEmbed.ephemeral = true;
                await interaction.editReply(errorEmbed);
                return;
            }
            await interaction.editReply({ content: "Message sent.", ephemeral: true });
        } else if(outputTarget == "channel-message" || outputTarget == "ephemeral-message") {
            await navigate(_embeds, interaction);
        } else {
            const errorEmbed = embed(interaction.user, "Error: invalid output target!", "Output", process.env.VERSION, client);
            await interaction.editReply(errorEmbed);
        }
    } catch(e) {
        console.log("ERROR");
        console.log(e);
    }
});

client.login(process.env.TOKEN);