"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import PokemonSearch from './components/PokemonSearch';
import PokemonDetails from './components/PokemonDetails';
import { teamService } from '../../lib/teamService';
import { authService } from '../../lib/authService';
import {
  DEFAULT_EVS,
  DEFAULT_IVS,
  DEFAULT_LEVEL,
  DEFAULT_MOVES,
  calculateEffectiveStats,
  clamp,
  mapPokemonForPersistence,
  normalizeMoves,
  normalizePokemonConfig,
  toNumber
} from '../../lib/pokemonConfig';
import {
  enrichStoredPokemon,
  fetchBuilderResources,
  fetchPokemonDetailsFromUrl
} from '../../lib/pokemonApi';
import BackToHome from '../components/BackToHome';

export default function Builder() {
  const [team, setTeam] = useState(Array(6).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  const [pokemonList, setPokemonList] = useState([]);
  const [movesList, setMovesList] = useState([]);
  const [abilitiesList, setAbilitiesList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [teamName, setTeamName] = useState('Meu Time');
  const [savedTeams, setSavedTeams] = useState([]);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);
  const router = useRouter();

  const loadSavedTeams = useCallback(async () => {
    try {
      const teams = await teamService.getUserTeams();
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }, []);

  const loadTeamFromData = useCallback(async (savedTeam) => {
    try {
      const loadedTeam = Array(6).fill(null);
      const storedTeamPokemon = Array.isArray(savedTeam.team_pokemon)
        ? savedTeam.team_pokemon.filter(Boolean)
        : [];

      for (let i = 0; i < storedTeamPokemon.length && i < 6; i++) {
        const storedPokemon = storedTeamPokemon[i];
        loadedTeam[i] = await enrichStoredPokemon(storedPokemon);
      }

      setTeam(loadedTeam);
      setTeamName(savedTeam.name);
      setEditingTeamId(savedTeam.id);
      setSelectedSlot(null);
      setSelectedPokemon(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Error loading team from data:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncAuth = async () => {
      try {
        const {
          data: { user: currentUser }
        } = await authService.getCurrentUser();

        if (!isMounted) return;

        setUser(currentUser ?? null);
        setAuthLoading(false);

        if (!currentUser) {
          router.replace('/auth');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error validating auth:', error);
        setUser(null);
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

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        const resources = await fetchBuilderResources();
        setPokemonList(resources.pokemonList);
        setMovesList(resources.movesList);
        setAbilitiesList(resources.abilitiesList);
        setItemsList(resources.itemsList);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadInitialState = async () => {
      await loadSavedTeams();

      const loadedTeamData = localStorage.getItem('loaded_team');
      if (loadedTeamData) {
        try {
          const loadedTeam = JSON.parse(loadedTeamData);
          await loadTeamFromData(loadedTeam);
          localStorage.removeItem('loaded_team');
        } catch (error) {
          console.error('Error loading team from localStorage:', error);
        }
      }
    };

    void loadInitialState();
  }, [authLoading, user, loadSavedTeams, loadTeamFromData]);

  const handleSlotClick = (index) => {
    setSelectedSlot(index);
    setSearchTerm('');
    setSelectedPokemon(team[index] ? { ...team[index], ...normalizePokemonConfig(team[index]) } : null);
  };

  const handlePokemonSelect = async (pokemon) => {
    if (selectedSlot === null) return;

    try {
      const pokemonDetails = await fetchPokemonDetailsFromUrl(pokemon);

      setSelectedPokemon(pokemonDetails);
      setTeam((prev) => prev.map((teamPokemon, index) => (index === selectedSlot ? pokemonDetails : teamPokemon)));
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
    }
  };

  const handlePokemonChange = (index, field, value) => {
    setTeam((prev) => {
      const updated = [...prev];
      const currentPokemon = updated[index];

      if (!currentPokemon) return prev;

      const updatedPokemon = {
        ...currentPokemon,
        [field]: value
      };

      updated[index] = updatedPokemon;

      if (selectedSlot === index) {
        setSelectedPokemon(updatedPokemon);
      }

      return updated;
    });
  };

  const handleMoveChange = (pokemonIndex, moveIndex, value) => {
    setTeam((prev) => {
      const updated = [...prev];
      const currentPokemon = updated[pokemonIndex];

      if (!currentPokemon) return prev;

      const currentMoves = normalizeMoves(currentPokemon.moves);
      currentMoves[moveIndex] = value;

      const updatedPokemon = {
        ...currentPokemon,
        moves: currentMoves
      };

      updated[pokemonIndex] = updatedPokemon;

      if (selectedSlot === pokemonIndex) {
        setSelectedPokemon(updatedPokemon);
      }

      return updated;
    });
  };

  const handleNestedChange = (index, group, field, value) => {
    const numericValue = toNumber(value, 0);

    setTeam((prev) => {
      const updated = [...prev];
      const currentPokemon = updated[index];

      if (!currentPokemon) return prev;

      const currentConfig = normalizePokemonConfig(currentPokemon);
      const sourceGroup = group === 'ivs' ? currentConfig.ivs : currentConfig.evs;
      const nextValue = group === 'ivs'
        ? clamp(numericValue, 0, 31)
        : clamp(numericValue, 0, 255);

      const nextGroup = {
        ...sourceGroup,
        [field]: nextValue
      };

      if (group === 'evs') {
        const totalEvs = Object.values(nextGroup).reduce((sum, ev) => sum + ev, 0);
        if (totalEvs > 510) {
          return prev;
        }
      }

      const updatedPokemon = {
        ...currentPokemon,
        [group]: nextGroup
      };

      updated[index] = updatedPokemon;

      if (selectedSlot === index) {
        setSelectedPokemon(updatedPokemon);
      }

      return updated;
    });
  };

  const handleAbilityChange = (value) => {
    if (selectedSlot === null) return;
    handlePokemonChange(selectedSlot, 'ability', value);
  };

  const handleItemChange = (value) => {
    if (selectedSlot === null) return;
    handlePokemonChange(selectedSlot, 'item', value);
  };

  const handleLevelChange = (value) => {
    if (selectedSlot === null) return;
    const normalizedLevel = clamp(toNumber(value, DEFAULT_LEVEL), 1, 100);
    handlePokemonChange(selectedSlot, 'level', normalizedLevel);
  };

  const handleIvChange = (stat, value) => {
    if (selectedSlot === null) return;
    handleNestedChange(selectedSlot, 'ivs', stat, value);
  };

  const handleEvChange = (stat, value) => {
    if (selectedSlot === null) return;
    handleNestedChange(selectedSlot, 'evs', stat, value);
  };

  const handleClearPokemon = () => {
    if (selectedSlot === null) return;

    setTeam((prev) => prev.map((teamPokemon, index) => (index === selectedSlot ? null : teamPokemon)));
    setSelectedPokemon(null);
    setSearchTerm('');
  };

  const handleChangePokemon = () => {
    setSelectedPokemon(null);
    setSearchTerm('');
  };

  const resetBuilder = () => {
    setTeam(Array(6).fill(null));
    setSelectedSlot(null);
    setSearchTerm('');
    setSelectedPokemon(null);
    setTeamName('Meu Time');
    setEditingTeamId(null);
  };

  const handleNewTeam = () => {
    resetBuilder();
  };

  const handleDeleteTeam = async (teamId) => {
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

      if (teamId === editingTeamId) {
        resetBuilder();
      }

      await loadSavedTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erro ao excluir time.');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const saveTeam = async () => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    try {
      const normalizedPokemonList = team.filter(Boolean).map(mapPokemonForPersistence);

      if (editingTeamId !== null) {
        await teamService.updateTeam(editingTeamId, teamName, normalizedPokemonList);
      } else {
        const createdTeam = await teamService.createTeam(teamName, normalizedPokemonList);
        setEditingTeamId(createdTeam.id);
      }

      await loadSavedTeams();
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const loadTeam = async (savedTeam) => {
    await loadTeamFromData(savedTeam);
  };

  const filteredPokemon = pokemonList.filter((pokemon) =>
    pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return <div className={styles.container}>Verificando autenticacao...</div>;
  }

  if (loading) {
    return <div className={styles.container}>Carregando...</div>;
  }

  const selectedConfig = selectedPokemon ? normalizePokemonConfig(selectedPokemon) : null;
  let pokemonSelectionContent;

  if (selectedSlot === null) {
    pokemonSelectionContent = (
      <div className={styles.selectionPlaceholder}>
        <h2>Configuracao do Pokemon</h2>
        <p>Selecione um slot do time para iniciar a configuracao.</p>
      </div>
    );
  } else if (!selectedPokemon) {
    pokemonSelectionContent = (
      <PokemonSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filteredPokemon={filteredPokemon}
        selectedPokemon={selectedPokemon}
        onPokemonSelect={handlePokemonSelect}
      />
    );
  } else {
    pokemonSelectionContent = (
      <PokemonDetails
        selectedPokemon={selectedPokemon}
        level={selectedConfig?.level ?? DEFAULT_LEVEL}
        moves={selectedConfig?.moves ?? [...DEFAULT_MOVES]}
        ability={selectedConfig?.ability ?? ''}
        item={selectedConfig?.item ?? ''}
        ivs={selectedConfig?.ivs ?? { ...DEFAULT_IVS }}
        evs={selectedConfig?.evs ?? { ...DEFAULT_EVS }}
        movesList={selectedPokemon?.availableMoves ?? []}
        abilitiesList={selectedPokemon?.abilities ?? []}
        itemsList={itemsList}
        onLevelChange={handleLevelChange}
        onMoveChange={(moveIndex, value) => {
          if (selectedSlot === null) return;
          handleMoveChange(selectedSlot, moveIndex, value);
        }}
        onAbilityChange={handleAbilityChange}
        onItemChange={handleItemChange}
        onIvChange={handleIvChange}
        onEvChange={handleEvChange}
        calculateEffectiveStats={calculateEffectiveStats}
        onClearPokemon={handleClearPokemon}
        onChangePokemon={handleChangePokemon}
      />
    );
  }

  return (
    <div className={styles.container}>
      <BackToHome />

      <section className={`${styles.panel} ${styles.teamSection}`}>
        <h1 className={styles.title}>Construtor de Times</h1>
        <p className={styles.editingStatus}>{editingTeamId !== null ? `Editando: ${teamName}` : 'Novo Time'}</p>
        <div className={styles.saveSection}>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nome do Time"
            className={styles.teamNameInput}
          />
          <div className={styles.buttonRow}>
            <button onClick={saveTeam} className={`${styles.button} ${styles.primaryButton} ${styles.saveButton}`}>Salvar Time</button>
            <button onClick={handleNewTeam} className={`${styles.button} ${styles.secondaryButton}`}>Novo Time</button>
          </div>
        </div>

        <div className={styles.teamSlots}>
          {team.map((pokemon, index) => (
            <button
              type="button"
              key={`team-slot-${index + 1}`}
              onClick={() => handleSlotClick(index)}
              className={`${styles.slot} ${pokemon ? styles.slotFilled : ''} ${selectedSlot === index ? styles.slotActive : ''}`}
            >
              {pokemon ? (
                <>
                  <img
                    src={pokemon.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                    alt={pokemon.name}
                    className={styles.slotImage}
                  />
                  <span className={styles.slotName}>{pokemon.name}</span>
                </>
              ) : (
                <>
                  <span className={styles.slotPlus}>+</span>
                  <span className={styles.slotEmptyText}>Adicionar</span>
                </>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.selectionSection}`}>
        {pokemonSelectionContent}
      </section>

      <aside className={styles.rightColumn}>
        <section className={`${styles.panel} ${styles.analysisSection}`}>
          <h2>Analise do Time</h2>
          <p>Total de Pokemon: {team.filter(Boolean).length}</p>
        </section>

        {savedTeams.length > 0 && (
          <section className={`${styles.panel} ${styles.savedTeamsSection}`}>
            <h2>Times Salvos</h2>
            <ul className={styles.savedTeamsList}>
              {savedTeams.map((savedTeam) => (
                <li key={savedTeam.id} className={styles.savedTeamItem}>
                  <span>{savedTeam.name}</span>
                  <div className={styles.savedTeamActions}>
                    <button
                      onClick={() => loadTeam(savedTeam)}
                      className={`${styles.button} ${styles.secondaryButton} ${styles.loadButton}`}
                      disabled={deletingTeamId === savedTeam.id}
                    >
                      Carregar
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(savedTeam.id)}
                      className={`${styles.button} ${styles.dangerButton} ${styles.loadButton}`}
                      disabled={deletingTeamId === savedTeam.id}
                    >
                      {deletingTeamId === savedTeam.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
