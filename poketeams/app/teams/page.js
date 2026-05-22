"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teamService } from '../../lib/teamService';
import { authService } from '../../lib/authService';
import { calculateEffectiveStats, getPokemonSpriteUrl } from '../../lib/pokemonConfig';
import styles from './page.module.css';
import BackToHome from '../components/BackToHome';

export default function Teams() {
  const [savedTeams, setSavedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const syncAuth = async () => {
      try {
        const {
          data: { user }
        } = await authService.getCurrentUser();

        if (!isMounted) return;

        if (!user) {
          setAuthLoading(false);
          router.replace('/auth');
          return;
        }

        setAuthLoading(false);
        loadSavedTeams();
      } catch (error) {
        if (!isMounted) return;
        console.error('Error validating auth:', error);
        setAuthLoading(false);
        router.replace('/auth');
      }
    };

    syncAuth();

    const { data: authListener } = authService.onAuthStateChange(() => {
      void syncAuth();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const loadSavedTeams = async () => {
    try {
      setLoading(true);
      const teams = await teamService.getUserTeams();
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTeam = async (team) => {
    try {
      localStorage.setItem('loaded_team', JSON.stringify(team));
      router.push('/builder');
    } catch (error) {
      console.error('Error loading team:', error);
    }
  };

  const handleViewTeam = (team) => {
    setSelectedTeam(team);
  };

  const handleDelete = async (teamId) => {
    if (!teamId) {
      alert('ID do time invalido.');
      return;
    }

    const confirmDelete = window.confirm('Tem certeza que deseja excluir este time?');
    if (!confirmDelete) return;

    try {
      setDeletingTeamId(teamId);
      await teamService.deleteTeam(teamId);
      alert('Time excluido com sucesso!');

      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
      }

      await loadSavedTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erro ao excluir time.');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleCloseView = () => {
    setSelectedTeam(null);
  };

  const getTeamPokemonCount = (team) => team.team_pokemon.filter(Boolean).length;
  const getTeamPokemon = (team) => team.team_pokemon.filter(Boolean);
  const getPokemonImage = (pokemon) => pokemon.image_url || getPokemonSpriteUrl(pokemon.pokemon_id);

  const getStatLabel = (stat) => {
    const statLabels = {
      hp: 'HP',
      attack: 'Ataque',
      defense: 'Defesa',
      specialAttack: 'Ataque Especial',
      specialDefense: 'Defesa Especial',
      speed: 'Velocidade'
    };

    return statLabels[stat] || stat;
  };

  const handleModalBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleCloseView();
    }
  };

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleCloseView();
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <BackToHome />
        <div className={styles.pageShell}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>Meus Times Salvos</h1>
            <p className={styles.subtitle}>Gerencie e visualize seus times</p>
          </header>
          <div className={styles.statusCard}>
            <p>Verificando autenticacao...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <BackToHome />
        <div className={styles.pageShell}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>Meus Times Salvos</h1>
            <p className={styles.subtitle}>Gerencie e visualize seus times</p>
          </header>
          <div className={styles.statusCard}>
            <p>Carregando times...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <BackToHome />
      <div className={styles.pageShell}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Meus Times Salvos</h1>
          <p className={styles.subtitle}>Gerencie e visualize seus times</p>
        </header>

        {savedTeams.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Seu espaco de times esta vazio</p>
            <p className={styles.emptyText}>
              Monte seu primeiro time e volte aqui para acompanhar tudo em um painel completo.
            </p>
            <button
              onClick={() => router.push('/builder')}
              className={styles.createButton}
            >
              Criar Primeiro Time
            </button>
          </div>
        ) : (
          <div className={styles.teamsGrid}>
            {savedTeams.map((team) => (
              <div key={team.id} className={styles.teamCard}>
                <div className={styles.teamTop}>
                  <h3 className={styles.teamName}>{team.name}</h3>
                  <span className={styles.teamCount}>{getTeamPokemonCount(team)}/6 Pokemon</span>
                </div>

                <div className={styles.teamDivider} />

                <div className={styles.teamPreview}>
                  {getTeamPokemon(team).slice(0, 6).map((pokemon) => (
                    <div
                      key={pokemon.id}
                      className={`${styles.pokemonSlot} ${styles.pokemonFilled}`}
                      title={pokemon.name}
                      data-name={pokemon.name}
                    >
                      <div className={styles.pokemonMini}>
                        <img
                          src={getPokemonImage(pokemon)}
                          alt={pokemon.name}
                          className={styles.pokemonImage}
                        />
                        <span className={styles.pokemonName}>{pokemon.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.teamActions}>
                  <button
                    onClick={() => handleViewTeam(team)}
                    className={styles.viewButton}
                    disabled={deletingTeamId === team.id}
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => handleLoadTeam(team)}
                    className={styles.loadButton}
                    disabled={deletingTeamId === team.id}
                  >
                    Carregar para Editar
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className={styles.deleteButton}
                    disabled={deletingTeamId === team.id}
                  >
                    {deletingTeamId === team.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTeam && (
        <div
          className={styles.modalOverlay}
          onMouseDown={handleModalBackdropClick}
          onKeyDown={handleModalKeyDown}
          role="presentation"
        >
          <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="team-details-title">
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <h2 id="team-details-title">{selectedTeam.name}</h2>
                <p>{getTeamPokemonCount(selectedTeam)} de 6 Pokemon preenchidos</p>
              </div>
              <button
                onClick={handleCloseView}
                className={styles.closeButton}
                aria-label="Fechar modal"
              >
                X
              </button>
            </div>

            <div className={styles.teamDetails}>
              {getTeamPokemon(selectedTeam).map((pokemon) => (
                  <div key={pokemon.id} className={styles.pokemonDetail}>
                    <div className={styles.pokemonHeader}>
                      <img
                        src={getPokemonImage(pokemon)}
                        alt={pokemon.name}
                        className={styles.pokemonDetailImage}
                      />
                      <div className={styles.pokemonInfo}>
                        <h3>{pokemon.name}</h3>
                        {pokemon.nickname && <p>Apelido: {pokemon.nickname}</p>}
                        <p>Nivel: {pokemon.level}</p>
                      </div>
                    </div>

                    <div className={styles.pokemonStats}>
                      <h4>Stats Efetivos:</h4>
                      {(() => {
                        const effectiveStats = calculateEffectiveStats({
                          stats: pokemon.base_stats,
                          level: pokemon.level,
                          ivs: pokemon.ivs,
                          evs: pokemon.evs
                        });
                        return (
                          <div className={styles.statsGrid}>
                            {Object.entries(effectiveStats).map(([stat, value]) => (
                              <div key={stat} className={styles.statItem}>
                                <div className={styles.statHeader}>
                                  <span className={styles.statName}>{getStatLabel(stat)}</span>
                                  <span className={styles.statValue}>{value}</span>
                                </div>
                                <div className={styles.statBarContainer}>
                                  <div
                                    className={styles.statBar}
                                    style={{ width: `${Math.min(value, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {pokemon.moves && pokemon.moves.length > 0 && (
                      <div className={styles.pokemonMoves}>
                        <h4>Movimentos:</h4>
                        <div className={styles.movesList}>
                          {pokemon.moves.filter(Boolean).map((move) => (
                            <span key={`${pokemon.id}-${move}`} className={styles.moveTag}>{move}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(pokemon.ability || pokemon.item) && (
                      <div className={styles.pokemonMeta}>
                        {pokemon.ability && (
                          <p><strong>Habilidade:</strong> {pokemon.ability}</p>
                        )}
                        {pokemon.item && (
                          <p><strong>Item:</strong> {pokemon.item}</p>
                        )}
                      </div>
                    )}
                  </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => handleLoadTeam(selectedTeam)}
                className={styles.loadButton}
                disabled={deletingTeamId === selectedTeam.id}
              >
                Carregar para Editar
              </button>
              <button
                onClick={() => handleDelete(selectedTeam.id)}
                className={styles.deleteButton}
                disabled={deletingTeamId === selectedTeam.id}
              >
                {deletingTeamId === selectedTeam.id ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
