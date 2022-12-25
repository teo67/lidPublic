const Discord = require('discord.js');

const navigate = async (embeds, interaction, i = 0) => {
    const row = new Discord.ActionRowBuilder()
        .addComponents(
            new Discord.ButtonBuilder()
                .setCustomId("back")
                .setEmoji("◀️")
                .setStyle(Discord.ButtonStyle.Primary)
                .setDisabled(i == 0),
            new Discord.ButtonBuilder()
                .setCustomId("forward")
                .setEmoji("▶️")
                .setStyle(Discord.ButtonStyle.Primary)
                .setDisabled(i == embeds.length - 1)
        );
    const title = embeds[i].embeds[0].title;
    embeds[i].embeds[0].title += ` (${i + 1} / ${embeds.length})`;
    embeds[i].components = [row];
    const message = await interaction.editReply(embeds[i]);
    embeds[i].embeds[0].title = title;
    if(embeds.length > 1) {
        let newI = i;
        try {
            const response = (await message.awaitMessageComponent({ filter: int => { 
                return int.user.id === interaction.user.id;
            }, max: 1, time: 20000, errors: ['time'], componentType: Discord.ComponentType.Button }));
            await response.deferUpdate();
            newI = (response.customId == "back") ? (i - 1) : (i + 1);
        } catch {
            embeds[i].embeds[0].title = "Output (buttons expired)";
            embeds = [embeds[i]];
            newI = 0;
        } finally {
            await navigate(embeds, interaction, newI);
        }
    }
}

module.exports = navigate;