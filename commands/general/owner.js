/**
 * Owner Command - Sends bot owner's contact card (vCard)
 */

const config = require('../../config');

module.exports = {
    name: 'owner',
    aliases: ['creator', 'dev', 'botowner'],
    category: 'general',
    description: 'Show bot owner contact information',
    usage: '.owner',
    ownerOnly: false,

    async execute(sock, msg, args, context) {
        const { from, reply } = context;
        try {
            // Owner numbers array -> convert each to a vCard
            const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
            const vCards = config.ownerNumber.map((num, index) => {
                const name = ownerNames[index] || ownerNames[0] || 'Bot Owner';
                return {
                    vcard: `
BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;waid=${num}:${num}
END:VCARD
                    `.trim()
                };
            });

            const displayName = ownerNames[0] || config.ownerName || 'Bot Owner';

            await sock.sendMessage(from, {
                contacts: {
                    displayName: displayName,
                    contacts: vCards
                }
            });

            await reply('👑 Here is the contact of my *Owner*.');

        } catch (error) {
            console.error('Owner command error:', error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
