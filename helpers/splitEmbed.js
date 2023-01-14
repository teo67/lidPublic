const embed = require('./embed.js');

module.exports = (author, text, title, version, client, ephemeral = false) => {
    const maxLength = 4088;
    const returning = [];
    for(let i = 0; i < text.length; i += maxLength) {
        let str = text.substring(i, Math.min(i + maxLength, text.length));
        str = "```\n" + str + "\n```";
        returning.push(embed(author, str, title, version, client, ephemeral));
    }
    return returning;
}