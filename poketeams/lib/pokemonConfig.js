export const DEFAULT_LEVEL = 50
export const DEFAULT_MOVES = Object.freeze(['', '', '', ''])
export const DEFAULT_IVS = Object.freeze({
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31
})
export const DEFAULT_EVS = Object.freeze({
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0
})

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeMoves(moves) {
  const source = Array.isArray(moves) ? moves : []

  return Array.from({ length: DEFAULT_MOVES.length }, (_, index) => {
    const move = source[index]
    return typeof move === 'string' ? move : ''
  })
}

export function normalizeStatSpread(spread, defaults, min, max) {
  const source = spread && typeof spread === 'object' ? spread : {}

  return {
    hp: clamp(toNumber(source.hp, defaults.hp), min, max),
    attack: clamp(toNumber(source.attack ?? source.atk, defaults.attack), min, max),
    defense: clamp(toNumber(source.defense ?? source.def, defaults.defense), min, max),
    specialAttack: clamp(
      toNumber(source.specialAttack ?? source.spAtk ?? source.spa, defaults.specialAttack),
      min,
      max
    ),
    specialDefense: clamp(
      toNumber(source.specialDefense ?? source.spDef ?? source.spd, defaults.specialDefense),
      min,
      max
    ),
    speed: clamp(toNumber(source.speed ?? source.spe, defaults.speed), min, max)
  }
}

export function normalizePokemonConfig(pokemon = {}) {
  return {
    level: clamp(toNumber(pokemon.level, DEFAULT_LEVEL), 1, 100),
    moves: normalizeMoves(pokemon.moves),
    ability: typeof pokemon.ability === 'string' ? pokemon.ability : '',
    item: typeof pokemon.item === 'string' ? pokemon.item : '',
    ivs: normalizeStatSpread(pokemon.ivs, DEFAULT_IVS, 0, 31),
    evs: normalizeStatSpread(pokemon.evs, DEFAULT_EVS, 0, 255)
  }
}

export function getPokemonSpriteUrl(pokemonId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
}

export function mapStoredPokemonToBuilder(storedPokemon) {
  const normalized = normalizePokemonConfig(storedPokemon)

  return {
    id: storedPokemon.pokemon_id,
    name: storedPokemon.name || '',
    types: Array.isArray(storedPokemon.types) ? storedPokemon.types : [],
    stats: storedPokemon.base_stats || {},
    image: storedPokemon.image_url || getPokemonSpriteUrl(storedPokemon.pokemon_id),
    abilities: [],
    availableMoves: [],
    nickname: storedPokemon.nickname ?? null,
    ...normalized
  }
}

export function mapPokemonForPersistence(pokemon) {
  const normalizedConfig = normalizePokemonConfig(pokemon)

  return {
    id: pokemon.id,
    nickname: pokemon.nickname ?? null,
    level: normalizedConfig.level,
    ivs: normalizedConfig.ivs,
    evs: normalizedConfig.evs,
    moves: normalizedConfig.moves,
    ability: normalizedConfig.ability,
    item: normalizedConfig.item,
    name: pokemon.name,
    types: Array.isArray(pokemon.types) ? pokemon.types : [],
    stats: pokemon.stats || {},
    image: pokemon.image || null
  }
}

export function calculateEffectiveStats(pokemon) {
  if (!pokemon?.stats) return {}

  const effectiveStats = {}
  const normalizedConfig = normalizePokemonConfig(pokemon)

  for (const [stat, base] of Object.entries(pokemon.stats)) {
    const iv = normalizedConfig.ivs[stat] || 0
    const ev = normalizedConfig.evs[stat] || 0
    const trainedBase = base + iv + Math.floor(ev / 4)

    effectiveStats[stat] = stat === 'hp'
      ? Math.floor(((trainedBase * 2 + 100) * normalizedConfig.level) / 100) + normalizedConfig.level + 10
      : Math.floor((trainedBase * 2 * normalizedConfig.level) / 100) + 5
  }

  return effectiveStats
}
