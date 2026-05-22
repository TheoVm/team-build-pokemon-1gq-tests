import { authService } from '../authService'
import { supabase } from '../supabase'

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cadastra usuario com email normalizado e nome padrao', async () => {
    const mockData = { user: { id: 'user-1' } }
    supabase.auth.signUp.mockResolvedValue({ data: mockData, error: null })

    const result = await authService.signUp(' USER@EMAIL.COM ', 'secret123', '')

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'user@email.com',
      password: 'secret123',
      options: {
        data: {
          display_name: 'Usuario'
        }
      }
    })
    expect(result).toEqual(mockData)
  })

  it('rejeita cadastro sem email e nome curto', async () => {
    await expect(authService.signUp('', 'secret123', 'Ash')).rejects.toThrow('Email invalido.')
    await expect(authService.signUp('ash@kanto.com', 'secret123', 'Al')).rejects.toThrow(
      'O nome de usuario deve ter no minimo 3 caracteres.'
    )
  })

  it('entra com email normalizado e traduz erro de credenciais', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' }
    })

    await expect(authService.signIn(' USER@EMAIL.COM ', 'wrong')).rejects.toThrow('Senha invalida.')

    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 'token' } },
      error: null
    })

    await expect(authService.signIn(' USER@EMAIL.COM ', 'secret123')).resolves.toEqual({
      session: { access_token: 'token' }
    })
    expect(supabase.auth.signInWithPassword).toHaveBeenLastCalledWith({
      email: 'user@email.com',
      password: 'secret123'
    })
  })

  it('limpa sessao local quando o JWT aponta para usuario inexistente', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User from sub claim in JWT does not exist' }
    })
    supabase.auth.signOut.mockResolvedValue({ error: null })

    await expect(authService.getCurrentUser()).resolves.toEqual({
      data: { user: null },
      error: null
    })
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('propaga erros de signOut e delega listener de auth', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: new Error('logout failed') })
    await expect(authService.signOut()).rejects.toThrow('logout failed')

    const callback = jest.fn()
    authService.onAuthStateChange(callback)

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(callback)
  })
})
