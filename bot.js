const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

const fs = require('fs');

let data = [];

fs.readFile('./data.json', 'utf8', (err, jsonString) => {
  if (err) {
    console.log("[data] error reading file from disk:", err);
    updateData(data);

    return;
  }
  try {
    data = JSON.parse(jsonString);
    console.log("[data] data loaded from disk:", data);
  } catch (err) {
    console.log('[data] error parsing JSON string:', err);
  }
});

function updateData(newData) {
  fs.writeFile('./data.json', JSON.stringify(newData), err => {
    if (err) {
      console.log('[updateData] error writing file', err);
    } else {
      console.log('[updateData] successfully wrote file');
    }
  });
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

client.on('qr', qr => {
  console.log('[qr] generating...');
  qrcode.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
  console.log(`[loading_screen] ${percent}%`, message);
});

client.on('authenticated', (session) => {
  console.log('[authenticated] client is authenticated!');
});

client.on('auth_failure', error => {
  console.error('[auth_failure] ERROR', error);
});

client.on('ready', () => {
  console.log('[ready] client is ready!');
});

client.on('group_join', async (notification) => {
  console.log('[group_join]', notification);

  let wasAdded = false;
  for (const [key, value] of Object.entries(data)) {
    if (value.chatId === notification.chatId) {
      wasAdded = true;
      break;
    }
  }

  if (wasAdded == false) {
    const chat = await notification.getChat();

    if (chat.isGroup) {
      const newGroup = {
        name: chat.name,
        chatId: chat.id._serialized,
        owner: chat.owner.user,
        createdAt: chat.createdAt.toString()
      }

      data.push(newGroup);
      updateData(data);

      console.log('[group_join] adding group to data', newGroup);

      //TODO welcome message (group invite, commands and instructions)
      // const invite = await chat.getInviteCode()
      // notification.reply(`${invite}\nObrigado por me adicionar.`);
      notification.reply('Obrigado por me adicionar.');
    }
  } else {
    notification.reply('Alguem entrou.');
  }
});

client.on('group_leave', (notification) => {
  console.log('[group_leave]', notification);
  notification.reply('Alguem saiu.');

  if (notification.id.participant == client.info.wid._serialized) {
    console.log('[group_leave] you were removed');
    for (const [key, value] of Object.entries(data)) {
      if (value.chatId === notification.chatId) {
        console.log('[group_leave] removing group from data', value);

        delete data[key]; //TODO remove from array (this is not working properly...leaves an empty object)
        updateData(data);
        break;
      }
    }
  }
});

client.on('group_update', async (notification) => {
  console.log('[group_update]', notification);

  for (const [key, value] of Object.entries(data)) {
    if (value.chatId === notification.chatId) {
      const chat = await notification.getChat();

      data[key] = {
        name: chat.name,
        chatId: chat.id._serialized,
        owner: chat.owner.user,
        createdAt: chat.createdAt.toString()
      };
      updateData(data);

      console.log('[group_update] updating group data', data[key]);
      break;
    }
  }
});

client.on('change_state', state => {
  console.log('[change_state]', state);
});

client.on('disconnected', (reason) => {
  console.log('[disconnected] client disconnected', reason);
});

client.on('message', async message => {
  console.log('[message] received', message);
  console.log('[message] body = ', message.body);

  if (message.body === '!ping') {
    console.log('[message#ping] pong');
    message.reply('pong');

    return;
  }

  if (message.body.startsWith('!nome ')) {
    console.log('[message#nome]');

    let chat = await message.getChat();

    if (chat.isGroup) {
      let newSubject = message.body.slice(9);
      chat.setSubject(newSubject);
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('!desc ')) {
    console.log('[message#desc]');

    let chat = await message.getChat();

    if (chat.isGroup) {
      let newDescription = message.body.slice(6);
      chat.setDescription(newDescription);
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body === '!ajuda' || message.body === '!help' || message.body === '!comandos' || message.body === '!commands') {
    console.log('[message#ajuda]');

    message.reply(
      '```Comandos```:' +
      '\n\n*!ping* - Verifica se o BOT está online.' +
      '\n_Exemplo_: ```!ping```' +
      '\n\n*!info* - Retorna as informações do BOT.' +
      '\n_Exemplo_: ```!info```' +
      '\n\n*!nome* - Altera o nome do grupo.' +
      '\n_Exemplo_: ```!nome Bora sair galera```' +
      '\n\n*!desc* - Altera a descrição do grupo.' +
      '\n_Exemplo_: ```!desc Vamos nos encontrar as 19h```' +
      '\n\n*!ajuda* - Retorna os comandos disponíveis.' +
      '\n_Exemplo_: ```!ajuda```'
    );

    return;
  }

  if (message.body === '!info') {
    console.log('[message#info]');

    const chat = await message.getChat();

    const chats = await client.getChats();

    if (chat.isGroup) {
      message.reply(
        '```Informações```:' +
        `\n\n- *Nome*: ${client.info.pushname}` +
        `\n\n- *Número*: ${client.info.wid.user}` +
        `\n\n- *Plataforma*: ${client.info.platform}` +
        `\n\n- *Conversas*: ${chats.length}` +
        '\n\n```Informações do Grupo```:' +
        `\n\n- *Nome*: ${chat.name}` +
        `\n\n- *Descrição*: ${chat.description}` +
        `\n\n- *Data de Criação*: ${chat.createdAt.toString()}` +
        `\n\n- *Criado por*: ${chat.owner.user}` +
        `\n\n- *Número de Participantes*: ${chat.participants.length}`
      );
    } else {
      message.reply(
        '```Informações```:' +
        `\n\n- *Nome*: ${client.info.pushname}` +
        `\n\n- *Número*: ${client.info.wid.user}` +
        `\n\n- *Plataforma*: ${client.info.platform}` +
        `\n\n- *Conversas*: ${chats.length}`
      );
    }

    return;
  }

  //! OUT OF ORDER
  // if (message.body.startsWith('!criargrupo ')) {
  //   console.log('[message#criargrupo] creating group...');
  //   console.log('[message#criargrupo] split', message.body.split(' '));

  //   const name = message.body.split(' ')[2];
  //   console.log('[message#criargrupo] name', name);

  //   const participants = [await client.getNumberId(message.body.split(' ')[1]), await client.getNumberId('0077422222222')];
  //   console.log('[message#criargrupo] participants', participants);

  //   await client.createGroup(name, participants);

  //   console.log('[message#criargrupo] group created');

  //   return;
  // }

  //! NOT USED
  // if (message.body.startsWith('!sendto ')) {
  //   console.log('[message#sendto]');

  //   let number = message.body.split(' ')[1];
  //   let messageIndex = message.body.indexOf(number) + number.length;
  //   let message = message.body.slice(messageIndex, message.body.length);

  //   number = number.includes('@c.us') ? number : `${number}@c.us`;

  //   let chat = await message.getChat();
  //   chat.sendSeen();

  //   client.sendMessage(number, message);

  //   return;

  // }

  //! NOT USED
  // if (message.body === '!pin') {
  //   console.log('[message#pin]');

  //   const chat = await message.getChat();

  //   await chat.pin();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!archive') {
  //   console.log('[message#archive]');

  //   const chat = await message.getChat();

  //   await chat.archive();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!mute') {
  //   console.log('[message#mute]');

  //   const chat = await message.getChat();

  //   const unmuteDate = new Date();
  //   unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);

  //   await chat.mute(unmuteDate);

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!typing') {
  //   console.log('[message#typing]');

  //   const chat = await message.getChat();

  //   chat.sendStateTyping();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!recording') {
  //   console.log('[message#recording]');

  //   const chat = await message.getChat();

  //   chat.sendStateRecording();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!clearstate') {
  //   console.log('[message#clearstate]');

  //   const chat = await message.getChat();

  //   chat.clearState();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!jumpto') {
  //   console.log('[message#jumpto]');

  //   if (message.hasQuotedMsg) {
  //     const quotedMsg = await message.getQuotedMessage();

  //     client.interface.openChatWindowAt(quotedMsg.id._serialized);
  //   }

  //   return;
  // }

  //! OUT OF ORDER
  // if (message.body === '!buttons') {
  //   console.log('[message#buttons]');

  //   let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');

  //   client.sendMessage(message.from, button);

  //   return;
  // }

  //! OUT OF ORDER
  // if (message.body === '!list') {
  //   console.log('[message#list]');

  //   let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
  //   let list = new List('List body', 'btnText', sections, 'Title', 'footer');

  //   client.sendMessage(message.from, list);

  //   return;
  // }

  //! OUT OF ORDER
  // if (message.body === '!location') {
  //   console.log('[message#location]');

  //   message.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));

  //   return;
  // }

  // if (message.location) {
  //   console.log('[message.location]');

  //   message.reply(message.location);

  //   return;
  // }

  //! NOT USED
  // if (message.body.startsWith('!status ')) {
  //   console.log('[message#status]');

  //   const newStatus = message.body.split(' ')[1];

  //   await client.setStatus(newStatus);
  //   message.reply(`Status was updated to *${newStatus}*`);

  //   return;
  // }

  //! NOT USED
  // if (message.body.startsWith('!join ')) {
  //   console.log('[message#join]');

  //   const inviteCode = message.body.split(' ')[1];

  //   try {
  //     await client.acceptInvite(inviteCode);
  //     message.reply('Joined the group!');
  //   } catch (e) {
  //     message.reply('That invite code seems to be invalid.');
  //   }

  //   return;
  // }

  //! NOT USED
  // if (message.body.startsWith('!echo ')) {
  //   console.log('[message#echo]');

  //   message.reply(message.body.slice(6));

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!leave') {
  //   console.log('[message#leave]');

  //   let chat = await message.getChat();

  //   if (chat.isGroup) {
  //     chat.leave();
  //   } else {
  //     message.reply('Esse comando só pode ser usado em um grupo!');
  //   }

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!reaction') {
  //   console.log('[message#reaction]');

  //   message.react('👍');

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!mediainfo' && message.hasMedia) {
  //   console.log('[message#mediainfo]');

  //   const attachmentData = await message.downloadMedia();

  //   message.reply(`
  //           *Media info*
  //           MimeType: ${attachmentData.mimetype}
  //           Filename: ${attachmentData.filename}
  //           Data (length): ${attachmentData.data.length}
  //       `);

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!quoteinfo' && message.hasQuotedMsg) {
  //   console.log('[message#quoteinfo]');

  //   const quotedMsg = await message.getQuotedMessage();

  //   quotedMsg.reply(`
  //           ID: ${quotedMsg.id._serialized}
  //           Type: ${quotedMsg.type}
  //           Author: ${quotedMsg.author || quotedMsg.from}
  //           Timestamp: ${quotedMsg.timestamp}
  //           Has Media? ${quotedMsg.hasMedia}
  //       `);

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!resendmedia' && message.hasQuotedMsg) {
  //   console.log('[message#resendmedia]');

  //   const quotedMsg = await message.getQuotedMessage();

  //   if (quotedMsg.hasMedia) {
  //     const attachmentData = await quotedMsg.downloadMedia();

  //     client.sendMessage(message.from, attachmentData, { caption: 'Here\'s your requested media.' });
  //   }

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!mention') {
  //   console.log('[message#mention]');

  //   const contact = await message.getContact();
  //   const chat = await message.getChat();

  //   chat.sendMessage(`Oi @${contact.number}!`, {
  //     mentions: [contact]
  //   });

  //   return;
  // }

  //! NOT USED
  // if (message.body === '!delete') {
  //   console.log('[message#delete]');

  //   if (message.hasQuotedMsg) {
  //     const quotedMsg = await message.getQuotedMessage();

  //     if (quotedMsg.fromMe) {
  //       quotedMsg.delete(true);
  //     } else {
  //       message.reply('I can only delete my own messages');
  //     }
  //   }

  //   return;
  // }
});

console.log('\n[bot] starting...');
client.initialize();

process.on('SIGINT', () => { exit(); });  // CTRL+C
process.on('SIGQUIT', () => { exit(); }); // Keyboard quit
process.on('SIGTERM', () => { exit(); }); // `kill` command

function exit() {
  client.destroy();
  console.log('[bot] finished.');
}
