const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

const fs = require('fs');

let data = [];

fs.readFile('./data.json', 'utf8', (err, jsonString) => {
  if (err) {
    console.log('[data] error reading file from disk:', err);
    updateData(data);

    return;
  }
  try {
    data = JSON.parse(jsonString);
    console.log('[data] data loaded from disk:', data);
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

const MSG_ADD = 'Muito obrigado por me adicionar!' +
  '\n\nPara habilitar o serviço, me adicione como *Administrador* do grupo.';

const MSG_LEAVE = 'Foi bom enquanto durou, mas eu preciso ser *Administrador* para continuar.';

const MSG_WELCOME = '*Serviço habilitado!*' +
  '\n\nAqui estão as estruções de como usar:' +
  '\n\n*-* Gerencie os dados de seu evento (nome, descrição, data, hora, local)' +

  '\n\n```Comandos```:' +
  '\n\n*/ping* - Verifica se o BOT está online.' +
  '\n_Exemplo_: ```/ping```' +
  '\n\n*/info* - Retorna as informações do BOT.' +
  '\n_Exemplo_: ```/info```' +
  '\n\n*/nome* - Altera o nome do grupo.' +
  '\n_Exemplo_: ```/nome Bora sair galera```' +
  '\n\n*/desc* - Altera a descrição do grupo.' +
  '\n_Exemplo_: ```/desc Vamos nos encontrar as 19h```' +
  '\n\n*/ajuda* - Retorna os comandos disponíveis.' +
  '\n_Exemplo_: ```/ajuda```' +
  '\n\nSegue o link do convite do grupo, compartilhe com os convidados!';

const MSG_HELP = '```Comandos```:' +
  '\n\n*/ping* - Verifica se o BOT está online.' +
  '\n_Exemplo_: ```/ping```' +
  '\n\n*/info* - Retorna as informações do BOT.' +
  '\n_Exemplo_: ```/info```' +
  '\n\n*/nome* - Altera o nome do grupo.' +
  '\n_Exemplo_: ```/nome Bora sair galera```' +
  '\n\n*/desc* - Altera a descrição do grupo.' +
  '\n_Exemplo_: ```/desc Vamos nos encontrar as 19h```' +
  '\n\n*/ajuda* - Retorna os comandos disponíveis.' +
  '\n_Exemplo_: ```/ajuda```';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: process.argv[2] == '--show' ? false : true },
});

client.on('qr', qr => {
  console.log('[qr] generating...');
  qrcode.generate(qr, { small: true });

  updateData([]);
});

client.on('loading_screen', (percent, message) => {
  console.log(`[loading_screen] ${percent}%`, message);
});

client.on('authenticated', (session) => {
  console.log('[authenticated] client is authenticated!', session);
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
  for (const [, value] of Object.entries(data)) {
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
        createdAt: chat.createdAt.toString(),
        isAdm: false,
        date: null,
        schedule: null,
        location: null,
        guestArray: [],
        remainingTime: null
      };

      data.push(newGroup);
      updateData(data);

      console.log('[group_join] adding group to data', newGroup);

      notification.reply(MSG_ADD);
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

        delete data[key];
        data = data.filter(function (e) { return e; });
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

      if (data[key]['name'] != chat.name) {
        data[key]['name'] = chat.name;
        updateData(data);
      }

      if (data[key]['isAdm'] == false) {
        for (const participant of chat.participants) {
          if (participant.id._serialized == client.info.wid._serialized && participant.isAdmin) {
            data[key]['isAdm'] = true;
            updateData(data);

            console.log('[group_update] updating group data', data[key]);

            const invite = await chat.getInviteCode();
            console.log('[group_update] invite code', invite);
            // notification.reply(`https://chat.whatsapp.com/${invite}`);
            notification.reply(MSG_WELCOME.concat(`\n\nhttps://chat.whatsapp.com/${invite}`));

            return;
          }
        }
      } else {
        for (const participant of chat.participants) {
          if (participant.id._serialized == client.info.wid._serialized && !participant.isAdmin) {
            data[key]['isAdm'] = false;
            updateData(data);

            console.log('[group_update] updating group data', data[key]);

            notification.reply(MSG_LEAVE);

            return;
          }
        }
      }
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

  if (message.body === '/ping') {
    console.log('[message#ping] pong');
    message.reply('pong');

    return;
  }

  if (message.body.startsWith('/nome ')) {
    console.log('[message#nome]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newName = message.body.slice(6);
      console.log('[message#nome] newName', newName);

      chat.setSubject(newName);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['name'] = newName;
          updateData(data);
        }
      }

      message.reply('Nome atualizada com sucesso!');
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/desc ')) {
    console.log('[message#desc]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newDescription = message.body.slice(6);
      console.log('[message#desc] newDescription', newDescription);

      chat.setDescription(newDescription);

      message.reply('Descrição atualizada com sucesso!');
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/data ')) {
    console.log('[message#data]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newDate = message.body.slice(6);
      console.log('[message#data] newDate', newDate);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['date'] = newDate;
          updateData(data);

          message.reply('Data atualizada com sucesso!');
        }
      }
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/hora ')) {
    console.log('[message#hora]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newSchedule = message.body.slice(6);
      console.log('[message#hora] newSchedule', newSchedule);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['schedule'] = newSchedule;
          updateData(data);

          message.reply('Hora atualizada com sucesso!');
        }
      }
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body.startsWith('/local ')) {
    console.log('[message#local]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      const newLocation = message.body.slice(7);
      console.log('[message#local] newLocation', newLocation);

      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          data[key]['location'] = newLocation;
          updateData(data);

          message.reply('Local atualizado com sucesso!');
        }
      }
    } else {
      message.reply('Esse comando só pode ser usado em um grupo!');
    }

    return;
  }

  if (message.body === '/evento') {
    console.log('[message#evento]');

    const chat = await message.getChat();

    if (chat.isGroup) {
      for (const [key, value] of Object.entries(data)) {
        if (value.chatId === chat.id._serialized) {
          const name = data[key]['name'];
          console.log('[message#evento] name', name);

          const date = data[key]['date'];
          console.log('[message#evento] date', date);

          const schedule = data[key]['schedule'];
          console.log('[message#evento] schedule', schedule);

          const location = data[key]['location'];
          console.log('[message#evento] location', location);

          const guestArray = data[key]['guestArray'].length > 0 ? data[key]['guestArray'] : null;
          console.log('[message#evento] guestArray', guestArray);

          const remainingTime = data[key]['remainingTime'];
          console.log('[message#evento] remainingTime', remainingTime);


          message.reply(
            `Detalhes do *${name}*:` +
            `\n\n- \`\`\`Data\`\`\`: *${date}*` +
            `\n\n- \`\`\`Hora\`\`\`: *${schedule}*` +
            `\n\n- \`\`\`Local\`\`\`: *${location}*` +
            `\n\n- \`\`\`Lista de convidados\`\`\`: *${guestArray}*` +
            `\n\n- \`\`\`Faltam\`\`\`: *${remainingTime}*`
          );
        }
      }
    }

    return;
  }

  if (message.body === '/ajuda' || message.body === '/help' || message.body === '/comandos' || message.body === '/commands') {
    console.log('[message#ajuda]');

    message.reply(MSG_HELP);

    return;
  }

  if (message.body === '/info') {
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
  // if (message.body.startsWith('/criargrupo ')) {
  //   console.log('[message#criargrupo] creating group...');
  //   console.log('[message#criargrupo] split', message.body.split(' '));

  //   const name = message.body.split(' ')[1];
  //   console.log('[message#criargrupo] name', name);

  //   const participants = [await client.getNumberId(message.body.split(' ')[2]), await client.getNumberId(message.body.split(' ')[3])];
  //   console.log('[message#criargrupo] participants', participants);

  //   const group = await client.createGroup(name, participants);

  //   console.log('[message#criargrupo] group created', group);

  //   return;
  // }

  //! NOT USED
  // if (message.body.startsWith('/sendto ')) {
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
  // if (message.body === '/pin') {
  //   console.log('[message#pin]');

  //   const chat = await message.getChat();

  //   await chat.pin();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/archive') {
  //   console.log('[message#archive]');

  //   const chat = await message.getChat();

  //   await chat.archive();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/mute') {
  //   console.log('[message#mute]');

  //   const chat = await message.getChat();

  //   const unmuteDate = new Date();
  //   unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);

  //   await chat.mute(unmuteDate);

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/typing') {
  //   console.log('[message#typing]');

  //   const chat = await message.getChat();

  //   chat.sendStateTyping();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/recording') {
  //   console.log('[message#recording]');

  //   const chat = await message.getChat();

  //   chat.sendStateRecording();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/clearstate') {
  //   console.log('[message#clearstate]');

  //   const chat = await message.getChat();

  //   chat.clearState();

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/jumpto') {
  //   console.log('[message#jumpto]');

  //   if (message.hasQuotedMsg) {
  //     const quotedMsg = await message.getQuotedMessage();

  //     client.interface.openChatWindowAt(quotedMsg.id._serialized);
  //   }

  //   return;
  // }

  //! OUT OF ORDER
  // if (message.body === '/buttons') {
  //   console.log('[message#buttons]');

  //   let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');

  //   client.sendMessage(message.from, button);

  //   return;
  // }

  //! OUT OF ORDER
  // if (message.body === '/list') {
  //   console.log('[message#list]');

  //   let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
  //   let list = new List('List body', 'btnText', sections, 'Title', 'footer');

  //   client.sendMessage(message.from, list);

  //   return;
  // }

  //! OUT OF ORDER
  // if (message.body === '/location') {
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
  // if (message.body.startsWith('/status ')) {
  //   console.log('[message#status]');

  //   const newStatus = message.body.split(' ')[1];

  //   await client.setStatus(newStatus);
  //   message.reply(`Status was updated to *${newStatus}*`);

  //   return;
  // }

  //! NOT USED
  // if (message.body.startsWith('/join ')) {
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
  // if (message.body.startsWith('/echo ')) {
  //   console.log('[message#echo]');

  //   message.reply(message.body.slice(6));

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/leave') {
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
  // if (message.body === '/reaction') {
  //   console.log('[message#reaction]');

  //   message.react('👍');

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/mediainfo' && message.hasMedia) {
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
  // if (message.body === '/quoteinfo' && message.hasQuotedMsg) {
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
  // if (message.body === '/resendmedia' && message.hasQuotedMsg) {
  //   console.log('[message#resendmedia]');

  //   const quotedMsg = await message.getQuotedMessage();

  //   if (quotedMsg.hasMedia) {
  //     const attachmentData = await quotedMsg.downloadMedia();

  //     client.sendMessage(message.from, attachmentData, { caption: 'Here\'s your requested media.' });
  //   }

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/mention') {
  //   console.log('[message#mention]');

  //   const contact = await message.getContact();
  //   const chat = await message.getChat();

  //   chat.sendMessage(`Oi @${contact.number}!`, {
  //     mentions: [contact]
  //   });

  //   return;
  // }

  //! NOT USED
  // if (message.body === '/delete') {
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
