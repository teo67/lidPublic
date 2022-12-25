require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
	try {
        const cmd = new SlashCommandBuilder()
        .setName("lid")
        .setDescription("tell lid to interpret and run any number of expressions")
        .addStringOption(option => 
            option.setName("input")
                .setDescription("the code to be read by lid")
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("output-format")
                .setDescription("change which results are shown (default: last only)")
                .setRequired(false)
                .addChoices(
                    { name: "first-only", value: "first-only" },
                    { name: "last-only", value: "last-only" },
                    { name: "all", value: "all" },
                    { name: "none", value: "none" }
                )
        )
        .addStringOption(option => 
            option.setName("output-target")
                .setDescription("change how the results are shown (default: channel)")
                .setRequired(false)
                .addChoices(
                    { name: "channel-message", value: "channel-message" },
                    { name: "ephemeral-message", value: "ephemeral-message" },
                    { name: "direct-message", value: "direct-message" }
                )
        );
        
        const data = await rest.put(
			Routes.applicationCommands(process.env.CLIENT),
			{ body: [cmd.toJSON()] },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
        console.log("ERROR deploying commands:");
		console.error(error);
	}
})();