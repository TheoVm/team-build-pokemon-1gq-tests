import PropTypes from 'prop-types';
import styles from './PokemonSearch.module.css';

export default function PokemonSearch({ searchTerm, onSearchChange, filteredPokemon, selectedPokemon, onPokemonSelect }) {
  return (
    <div className={styles.searchSection}>
      <div className={styles.sectionHeader}>
        <h2>Selecionar Pokemon</h2>
        <p>Busque e escolha um Pokemon para o slot atual.</p>
      </div>

      <input
        type="text"
        placeholder="Buscar Pokemon..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.pokemonList}>
        {filteredPokemon.map(pokemon => {
          const id = pokemon.url.split('/').filter(Boolean).pop();
          const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
          return (
            <button
              type="button"
              key={pokemon.name}
              onClick={() => onPokemonSelect(pokemon)}
              className={`${styles.pokemonItem} ${selectedPokemon?.name === pokemon.name ? styles.pokemonItemSelected : ''}`}
            >
              <img src={imageUrl} alt={pokemon.name} className={styles.pokemonImage} />
              <p className={styles.pokemonName}>{pokemon.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

PokemonSearch.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  filteredPokemon: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedPokemon: PropTypes.shape({
    name: PropTypes.string
  }),
  onPokemonSelect: PropTypes.func.isRequired
};
