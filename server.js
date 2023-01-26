const http = require('http')
const fs = require('fs')
const path = require('path')

const app = http.createServer()

const pokemonList = JSON.parse(fs.readFileSync(path.join(__dirname, 'pokemondb.json'), 'utf8')).pokemon.map(v => {
  const slug = v.name.toLowerCase().replace(' ', '-').replace(/[^a-z\-]+/g, '')

  return {
    ...v,
    infoUrl: `https://pokemondb.net/pokedex/${slug}`,
  }
})
const baseUrl = 'https://sgpokemap.com/query2.php'
let time = Date.now()
let since = 0

const botToken = process.env.POGO_TELEGRAM_BOT_TOKEN
const chatId = process.env.POGO_TELEGRAM_CHAT_ID

const pokemonIds = pokemonList.map(v => v.id).join(',')
const pickIVs = ['15/15/15', '0/15/15']

const run = async () => {
  const url = `${baseUrl}?mons=${pokemonIds}&minIV=20&time=${time}&since=${since}`
  let resp

  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.61',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://sgpokemap.com/'
      },
    })
  } catch (e) {
    return
  }
  
  console.log(new Date(), 'status', resp.status)
  if (resp.status !== 200) {
    return
  }

  const data = await resp.json()
  console.log(new Date(), `Found total pokemons: ${data.pokemons.length}`)
  
  since = data.meta.inserted
  time = Date.now()

  for await (const pokemon of data.pokemons) {
    const pokeInfo = pokemonList.filter(v => v.id === pokemon.pokemon_id)[0]
    const iv = `${pokemon.attack}/${pokemon.defence}/${pokemon.stamina}`
    console.log(pokeInfo.name, iv, pokemon.cp)
    if (pickIVs.indexOf(iv) === -1) {
      continue
    }

    const messages = [`[*${pokeInfo.name}*](${pokeInfo.infoUrl})`]
    messages.push(`Level: ${pokemon.level} IV: ${iv} CP: ${pokemon.cp} Shiny: ${pokemon.shiny ? 'yes' : 'no'}`)
    messages.push(`Coords: \`${pokemon.lat},${pokemon.lng}\``)
    const despawn = new Date(pokemon.despawn * 1000)
    messages.push(`Disappear at: ${despawn.toLocaleTimeString()}`)

    // send it to telegram
    const notifyResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: JSON.stringify({
        text: messages.join("\n"),
        chat_id: chatId,
        parse_mode: 'MarkdownV2'
      }),
      headers: {
        'content-type': 'application/json'
      }
    })

    console.log(await notifyResp.json())
  }
}

// run every seconds
setInterval(run, 60 * 1000);
run();

app.listen(3000, () => {
  console.log('Running on http://localhost:3000/')
})
