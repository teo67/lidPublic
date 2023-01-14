require('dotenv').config();
const Discord = require('discord.js');
const embed = require('./helpers/embed.js');
const splitEmbed = require('./helpers/splitEmbed.js');
const navigate = require('./helpers/navigate.js');
const runText = require('./helpers/runText.js');

const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.GuildMessageReactions] });

client.once(Discord.Events.ClientReady, () => {
    console.log("lid is up and running!");
});

client.on(Discord.Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.isChatInputCommand() || interaction.commandName != "lid") {
            return;
        }
        
        const text = interaction.options.getString("input");
        const outputFormat = interaction.options.getString("output-format") ?? "last-only";
        const outputTarget = interaction.options.getString("output-target") ?? "channel-message";
        const visibility = interaction.options.getString("visibility") ?? "public";
        await interaction.deferReply({ ephemeral: outputTarget == "ephemeral-message" });
        let output = await runText(text, outputFormat, visibility, interaction);
        if(output.length == 0) {
            output = " ";
        }
        
        const _embeds = splitEmbed(interaction.user, output, "Output", process.env.VERSION, client, outputTarget == "ephemeral-message");
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