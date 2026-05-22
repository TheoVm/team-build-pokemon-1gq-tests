import {
  calculateEffectiveStats,
  mapStoredPokemonToBuilder,
  mapPokemonForPersistence,
  normalizePokemonConfig
} from '../pokemonConfig'

describe('pokemonConfig', () => {
  it('normaliza level, IVs, EVs, golpes, habilidade e item com limites seguros', () => {
    const config = normalizePokemonConfig({
      level: 150,
      moves: ['tackle', 10, 'thunderbolt'],
      ability: 123,
      item: 'leftovers',
      ivs: { hp: 40, atk: 20, def: -5, spa: 15, spd: 18, spe: 99 },
      evs: { hp: 300, attack: '80', defense: 'invalid' }
    })

    expect(config).toEqual({
      level: 100,
      moves: ['tackle', '', 'thunderbolt', ''],
      ability: '',
      item: 'leftovers',
      ivs: {
        hp: 31,
        attack: 20,
        defense: 0,
        specialAttack: 15,
        specialDefense: 18,
        speed: 31
      },
      evs: {
        hp: 255,
        attack: 80,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0
      }
    })
  })

  it('prepara pokemon para persistencia sem vazar campos da UI', () => {
    const pokemon = mapPokemonForPersistence({
      id: 25,
      name: 'pikachu',
      types: ['electric'],
      stats: { hp: 35 },
      image: 'pikachu.png',
      availableMoves: ['surf'],
      level: 50,
      moves: ['thunderbolt']
    })

    expect(pokemon).toEqual({
      id: 25,
      nickname: null,
      level: 50,
      ivs: {
        hp: 31,
        attack: 31,
        defense: 31,
        specialAttack: 31,
        specialDefense: 31,
        speed: 31
      },
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0
      },
      moves: ['thunderbolt', '', '', ''],
      ability: '',
      item: '',
      name: 'pikachu',
      types: ['electric'],
      stats: { hp: 35 },
      image: 'pikachu.png'
    })
  })

  it('converte pokemon salvo no banco para o formato usado pelo builder', () => {
    const pokemon = mapStoredPokemonToBuilder({
      pokemon_id: 1,
      name: 'bulbasaur',
      types: ['grass', 'poison'],
      base_stats: { hp: 45 },
      image_url: null,
      nickname: 'starter',
      level: 20
    })

    expect(pokemon).toMatchObject({
      id: 1,
      name: 'bulbasaur',
      types: ['grass', 'poison'],
      stats: { hp: 45 },
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      abilities: [],
      availableMoves: [],
      nickname: 'starter',
      level: 20
    })
  })

  it('calcula stats efetivos usando level, IVs e EVs normalizados', () => {
    const stats = calculateEffectiveStats({
      level: 50,
      stats: { hp: 35, attack: 55 },
      ivs: { hp: 31, attack: 31 },
      evs: { hp: 0, attack: 252 }
    })

    expect(stats).toEqual({
      hp: 176,
      attack: 154
    })
  })
})
