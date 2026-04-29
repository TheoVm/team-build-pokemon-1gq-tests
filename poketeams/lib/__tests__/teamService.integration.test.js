import { teamService } from '../teamService'
import { supabase } from '../supabase'

describe('Testes de Integração do Serviço de Times', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('criarTime', () => {
    it('deve criar um time com pokemon para usuário autenticado', async () => {
      const mockUser = { id: 'user-123' }
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const mockTeam = { id: 'team-123', user_id: mockUser.id, name: 'Meu Time' }
      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTeam, error: null })
          })
        })
      })

      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      })

      const pokemonList = [
        {
          id: 25,
          name: 'pikachu',
          types: ['electric'],
          stats: { hp: 35, attack: 55 },
          image: 'pikachu.png',
          level: 50,
          ivs: { hp: 31, attack: 31 },
          evs: { hp: 0, attack: 0 },
          moves: ['thunderbolt', '', '', ''],
          ability: 'static',
          item: ''
        }
      ]

      const result = await teamService.createTeam('Meu Time', pokemonList)

      expect(supabase.auth.getUser).toHaveBeenCalled()
      expect(supabase.from).toHaveBeenCalledWith('teams')
      expect(supabase.from).toHaveBeenCalledWith('team_pokemon')
      expect(result).toEqual(mockTeam)
    })

    it('deve lançar erro se usuário não autenticado', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(teamService.createTeam('Meu Time', [])).rejects.toThrow('AUTH_REQUIRED')
    })

    it('deve lidar com erro na criação do time', async () => {
      const mockUser = { id: 'user-123' }
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Insert failed'))
          })
        })
      })

      await expect(teamService.createTeam('Meu Time', [])).rejects.toThrow('Insert failed')
    })
  })

  describe('obterTimesDoUsuario', () => {
    it('deve obter times para usuário autenticado', async () => {
      const mockUser = { id: 'user-123' }
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const mockTeams = [
        {
          id: 'team-123',
          name: 'Meu Time',
          created_at: '2024-01-01',
          team_pokemon: [
            {
              pokemon_id: 25,
              name: 'pikachu',
              level: 50,
              ivs: { hp: 31 },
              evs: { hp: 0 },
              moves: ['thunderbolt', '', '', ''],
              ability: 'static',
              item: ''
            }
          ]
        }
      ]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockTeams, error: null })
          })
        })
      })

      const result = await teamService.getUserTeams()

      expect(supabase.auth.getUser).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Meu Time')
    })
  })

  describe('atualizarTime', () => {
    it('deve atualizar time e pokemon', async () => {
      const mockUser = { id: 'user-123' }
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const mockUpdatedTeam = { id: 'team-123', name: 'Time Atualizado' }

      supabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockUpdatedTeam, error: null })
              })
            })
          })
        })
      })

      supabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      })

      const pokemonList = [
        {
          id: 1,
          name: 'bulbasaur',
          level: 50
        }
      ]

      const result = await teamService.updateTeam('team-123', 'Time Atualizado', pokemonList)

      expect(result).toEqual(mockUpdatedTeam)
    })
  })

  describe('deletarTime', () => {
    it('deve deletar time e pokemon', async () => {
      const mockUser = { id: 'user-123' }
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'team-123' }, error: null })
            })
          })
        })
      })

      supabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      supabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      })

      await expect(teamService.deleteTeam('team-123')).resolves.not.toThrow()
    })
  })
})