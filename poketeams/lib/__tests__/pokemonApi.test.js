import {
  enrichStoredPokemon,
  fetchBuilderResources,
  fetchPokemonDetailsFromUrl,
  mapApiPokemonToBuilder
} from '../pokemonApi'

const apiPokemon = {
  id: 25,
  name: 'pikachu',
  types: [{ type: { name: 'electric' } }],
  stats: [
    { stat: { name: 'hp' }, base_stat: 35 },
    { stat: { name: 'attack' }, base_stat: 55 },
    { stat: { name: 'defense' }, base_stat: 40 },
    { stat: { name: 'special-attack' }, base_stat: 50 },
    { stat: { name: 'special-defense' }, base_stat: 50 },
    { stat: { name: 'speed' }, base_stat: 90 }
  ],
  sprites: { front_default: 'pikachu.png' },
  abilities: [{ ability: { name: 'static' } }],
  moves: [{ move: { name: 'thunderbolt' } }]
}

describe('pokemonApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('mapeia resposta da PokeAPI para o formato do builder', () => {
    expect(mapApiPokemonToBuilder(apiPokemon)).toMatchObject({
      id: 25,
      name: 'pikachu',
      types: ['electric'],
      stats: {
        hp: 35,
        attack: 55,
        defense: 40,
        specialAttack: 50,
        specialDefense: 50,
        speed: 90
      },
      image: 'pikachu.png',
      abilities: ['static'],
      availableMoves: ['thunderbolt'],
      level: 50
    })
  })

  it('busca detalhes a partir da URL da lista de pokemon', async () => {
    global.fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue(apiPokemon) })

    await expect(fetchPokemonDetailsFromUrl({ url: 'https://pokeapi.co/api/v2/pokemon/25' })).resolves.toMatchObject({
      name: 'pikachu',
      moves: ['', '', '', '']
    })
  })

  it('mantem dados salvos quando enriquecimento externo falha', async () => {
    global.fetch.mockRejectedValue(new Error('offline'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(enrichStoredPokemon({
      pokemon_id: 1,
      name: 'bulbasaur',
      types: ['grass'],
      base_stats: { hp: 45 },
      level: 20
    })).resolves.toMatchObject({
      id: 1,
      name: 'bulbasaur',
      level: 20
    })

    consoleSpy.mockRestore()
  })

  it('carrega recursos do builder e filtra itens especiais', async () => {
    global.fetch
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ results: [{ name: 'bulbasaur' }] }) })
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ results: [{ name: 'tackle' }] }) })
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ results: [{ name: 'overgrow' }] }) })
      .mockResolvedValue({ json: jest.fn().mockResolvedValue({ items: [{ name: 'leftovers' }, { name: 'fire-z' }] }) })

    await expect(fetchBuilderResources()).resolves.toEqual({
      pokemonList: [{ name: 'bulbasaur' }],
      movesList: ['tackle'],
      abilitiesList: ['overgrow'],
      itemsList: ['leftovers']
    })
  })
})
