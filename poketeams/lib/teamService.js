import { supabase } from './supabase'
import { normalizePokemonConfig } from './pokemonConfig'

async function getRequiredUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('AUTH_REQUIRED')

  return user
}

function mapPokemonInsert(teamId, pokemon) {
  const normalizedConfig = normalizePokemonConfig(pokemon)

  return {
    team_id: teamId,
    pokemon_id: pokemon.id,
    nickname: pokemon.nickname ?? null,
    level: normalizedConfig.level,
    ivs: normalizedConfig.ivs,
    evs: normalizedConfig.evs,
    moves: normalizedConfig.moves,
    ability: normalizedConfig.ability,
    item: normalizedConfig.item,
    name: pokemon.name,
    types: Array.isArray(pokemon.types) ? pokemon.types : [],
    base_stats: pokemon.stats && typeof pokemon.stats === 'object' ? pokemon.stats : null,
    image_url: pokemon.image ?? null
  }
}

async function insertTeamPokemon(teamId, pokemonList) {
  const pokemonInserts = pokemonList.map((pokemon) => mapPokemonInsert(teamId, pokemon))

  if (pokemonInserts.length === 0) return

  const { error } = await supabase
    .from('team_pokemon')
    .insert(pokemonInserts)

  if (error) throw error
}

function normalizeStoredTeam(team) {
  return {
    ...team,
    team_pokemon: (team.team_pokemon || []).filter(Boolean).map((pokemon) => ({
      ...pokemon,
      ...normalizePokemonConfig(pokemon)
    }))
  }
}

export const teamService = {
  // Create a new team
  async createTeam(teamName, pokemonList) {
    const user = await getRequiredUser()

    const { data, error } = await supabase
      .from('teams')
      .insert([
        {
          user_id: user.id,
          name: teamName
        }
      ])
      .select()
      .single()

    if (error) throw error

    await insertTeamPokemon(data.id, pokemonList)

    return data
  },

  // Get logged user teams
  async getUserTeams() {
    const user = await getRequiredUser()

    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        user_id,
        name,
        created_at,
        team_pokemon (
          id,
          team_id,
          pokemon_id,
          nickname,
          level,
          ivs,
          evs,
          moves,
          ability,
          item,
          name,
          types,
          base_stats,
          image_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(normalizeStoredTeam)
  },

  // Update a team
  async updateTeam(teamId, teamName, pokemonList) {
    const user = await getRequiredUser()

    // 1) Update the team name
    const { data: updatedTeam, error: teamError } = await supabase
      .from('teams')
      .update({ name: teamName })
      .eq('id', teamId)
      .eq('user_id', user.id)
      .select('id, name')
      .single()

    if (teamError) throw teamError

    // 2) Remove old pokemon from this team
    const { error: deleteError } = await supabase
      .from('team_pokemon')
      .delete()
      .eq('team_id', teamId)

    if (deleteError) throw deleteError

    await insertTeamPokemon(teamId, pokemonList)

    return updatedTeam
  },

  // Delete a team
  async deleteTeam(teamId) {
    if (!teamId) {
      throw new Error('TEAM_ID_REQUIRED')
    }

    const user = await getRequiredUser()

    const { data: existingTeam, error: teamLookupError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (teamLookupError) throw teamLookupError
    if (!existingTeam) throw new Error('TEAM_NOT_FOUND')

    const { error: deletePokemonError } = await supabase
      .from('team_pokemon')
      .delete()
      .eq('team_id', teamId)

    if (deletePokemonError) throw deletePokemonError

    const { error: deleteTeamError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('user_id', user.id)

    if (deleteTeamError) throw deleteTeamError
  }
}
