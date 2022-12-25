const embed = require('./embed.js');

module.exports = (author, text, title, version, client) => {
    const maxLength = 4090;
    const returning = [];
    for(let i = 0; i < text.length; i += maxLength) {
        let str = text.substring(i, Math.min(i + maxLength, text.length));
        str = "```" + str + "```";
        returning.push(embed(author, str, title, version, client));
    }
    return returning;
}