import {
  mapStoredPokemonToBuilder,
  normalizePokemonConfig
} from './pokemonConfig'

const ITEM_CATEGORY_IDS = [2, 3, 4, 5, 6, 9, 10]
const EXCLUDED_ITEM_PATTERNS = [
  'z-crystal',
  '-z',
  'box',
  'pokedex',
  'poke-ball',
  'ancient-feathers',
  'birthday-cupcake',
  'ice-type-dragon',
  'secret-blob',
  'glass-wing',
  'odd-potion',
  'secret-sauce'
]

const STAT_NAME_MAP = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed'
}

async function fetchJson(url) {
  const response = await fetch(url)
  return response.json()
}

function mapApiStats(stats) {
  return stats.reduce((mappedStats, statData) => {
    const statName = STAT_NAME_MAP[statData.stat.name]
    if (statName) mappedStats[statName] = statData.base_stat
    return mappedStats
  }, {})
}

export function mapApiPokemonToBuilder(data, basePokemon = {}) {
  return {
    ...basePokemon,
    id: data.id,
    name: data.name,
    types: data.types.map((typeData) => typeData.type.name),
    stats: mapApiStats(data.stats),
    image: data.sprites.front_default || basePokemon.image,
    abilities: data.abilities.map((abilityData) => abilityData.ability.name),
    availableMoves: data.moves.slice(0, 100).map((moveData) => moveData.move.name),
    nickname: basePokemon.nickname ?? null,
    ...normalizePokemonConfig(basePokemon)
  }
}

export async function fetchPokemonDetailsFromUrl(pokemon) {
  const data = await fetchJson(pokemon.url)
  return mapApiPokemonToBuilder(data, normalizePokemonConfig({}))
}

export async function enrichStoredPokemon(storedPokemon) {
  const basePokemon = mapStoredPokemonToBuilder(storedPokemon)

  try {
    const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${storedPokemon.pokemon_id}`)
    return mapApiPokemonToBuilder(data, basePokemon)
  } catch (error) {
    console.error(`Error loading Pokemon ${storedPokemon.pokemon_id}:`, error)
    return basePokemon
  }
}

async function fetchNamedResources(url) {
  const data = await fetchJson(url)
  return data.results
}

async function fetchItemCategoryNames(categoryId) {
  try {
    const categoryData = await fetchJson(`https://pokeapi.co/api/v2/item-category/${categoryId}`)
    return categoryData.items?.map((item) => item.name) ?? []
  } catch (error) {
    console.error(`Error fetching item category ${categoryId}:`, error)
    return []
  }
}

function filterUsableItems(itemNames) {
  return itemNames.filter((itemName) => {
    const lowerName = itemName.toLowerCase()
    return !EXCLUDED_ITEM_PATTERNS.some((pattern) => lowerName.includes(pattern))
  })
}

export async function fetchBuilderResources() {
  const [pokemonList, moves, abilities, itemCategoryItems] = await Promise.all([
    fetchNamedResources('https://pokeapi.co/api/v2/pokemon?limit=151'),
    fetchNamedResources('https://pokeapi.co/api/v2/move?limit=100'),
    fetchNamedResources('https://pokeapi.co/api/v2/ability?limit=100'),
    Promise.all(ITEM_CATEGORY_IDS.map(fetchItemCategoryNames))
  ])

  return {
    pokemonList,
    movesList: moves.map((moveData) => moveData.name),
    abilitiesList: abilities.map((abilityData) => abilityData.name),
    itemsList: filterUsableItems(Array.from(new Set(itemCategoryItems.flat())))
  }
}
