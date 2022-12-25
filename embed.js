const Discord = require('discord.js');
module.exports = (author, text, title, version, client) => {
    const embed = new Discord.EmbedBuilder()
        .setAuthor({ name: `${author.username}`, iconURL: author.avatarURL() })
        .setColor('#ff6060')
        .setDescription(text)
        .addFields(
            { name: 'Ping', value: `${client.ws.ping} ms`, inline: true}
        )
        .setTimestamp()
        .setFooter({ text: `Lid v${version}`, iconURL: client.user.displayAvatarURL() })
        .setTitle(title);
    let returning = { content: "", embeds: [embed.data] };
    return returning;
}