const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bookclub')
    .setDescription('Creates a new book club!')
    .addStringOption(op => 
      op.setName('book')
        .setDescription('The book the book club is on')
        .setRequired(true)
    )
    .addIntegerOption(op => 
      op.setName('people')
        .setDescription('How many people you want for the club') 
        .setRequired(true) 
    )
    .addIntegerOption( op => 
      op.setName('hours')
        .setDescription('When, in hours, you want submissions closed') 
        .setRequired(true) 
    )
    ,

  async execute(interaction) {
    const book = interaction.options.getString('book')
    const numOfPeople = interaction.options.getInteger('people')

    const hours = interaction.options.getInteger('hours')
    const waitTimeInSeconds = hours * 3600
    const timeExpiresAt = Math.floor(new Date().getTime() / 1000) + waitTimeInSeconds

    const author = interaction.member.user.username

    const bookClub = book + ' Book Club ' + new Date().toDateString()

    const embedMessage = {
      title: bookClub,
      author: {
        name: author
      },
      description: `Running a book club on the book ${book}.`,
      fields: [
        {
          name: 'Amount of people wanted',
          value: `${numOfPeople}`
        },
        {
          name: `Submissions close in <t:${timeExpiresAt}:f>`,
          value: `Time runs out <t:${timeExpiresAt}:R>`
        }
      ]
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('primary')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👍')
      )

    const finishedEmbedMessage = await interaction.reply({ embeds: [embedMessage], components: [row] })

    await interaction.guild.roles.create({
      name: `${bookClub}`,
      permissions: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages
      ]
    })

    const bookClubRoleId = await interaction.guild.roles.cache.find(r => r.name === bookClub).id

    await interaction.guild.channels.create({
      name: `${bookClub}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: bookClubRoleId,
          allow: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ViewChannel
          ]
        }
      ]
    })

    const filter = i => {
      const hasBookClubRole = interaction.guild.members.cache.get(i.user.id).roles.cache.has(bookClubRoleId)
      if (hasBookClubRole === true) {
        i.reply({content: `You've already been added to the book club.`, ephemeral: true})
      }
      return hasBookClubRole === false
    }

    const disabledButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('primary')
          .setStyle(ButtonStyle.Primary)
          .setLabel('Submissions Closed')
          .setDisabled(true)
      )


    const waitTimeInMilliseconds = waitTimeInSeconds * 1000

    const collector = finishedEmbedMessage.createMessageComponentCollector({ filter, max: numOfPeople, time: waitTimeInMilliseconds})

    collector.on('collect', i => {
      const userById = interaction.guild.members.cache.get(i.user.id)
      userById.roles.add(bookClubRoleId)
      i.reply({content: `${i.user.username} has been added to the book club!`})
    })

    collector.on('end', c => {
      interaction.editReply({ embeds: [embedMessage], components: [disabledButton]})
      console.log(`collected ${c.size}`)
    })
  }
}