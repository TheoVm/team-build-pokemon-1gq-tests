import PropTypes from 'prop-types';
import styles from './PokemonDetails.module.css';

const statLabels = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  specialAttack: 'Ataque E',
  specialDefense: 'Defesa E',
  speed: 'Velocidade'
};
const moveSlots = ['move-1', 'move-2', 'move-3', 'move-4'];

function getStatLabel(stat) {
  return statLabels[stat] || stat;
}

export default function PokemonDetails({
  selectedPokemon,
  level,
  moves,
  ability,
  item,
  ivs,
  evs,
  movesList,
  abilitiesList,
  itemsList,
  onLevelChange,
  onMoveChange,
  onAbilityChange,
  onItemChange,
  onIvChange,
  onEvChange,
  calculateEffectiveStats,
  onClearPokemon,
  onChangePokemon,
}) {
  if (!selectedPokemon) return null;

  const effective = calculateEffectiveStats(selectedPokemon);
  const totalEvs = Object.values(evs).reduce((sum, ev) => sum + ev, 0);

  return (
    <div className={styles.pokemonDetails}>
      <div className={`${styles.sectionHeader} ${styles.pokemonDetailsHeader}`}>
        <div className={styles.pokemonIdentity}>
          <h3 className={styles.pokemonTitle}>{selectedPokemon.name}</h3>
          <p className={styles.pokemonTypes}>Tipos: <span>{selectedPokemon.types.join(', ')}</span></p>
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={onChangePokemon} className={`${styles.button} ${styles.secondaryButton} ${styles.changeButton}`}>Trocar Pokemon</button>
          <button onClick={onClearPokemon} className={`${styles.button} ${styles.dangerButton} ${styles.deleteButton}`}>Remover Pokemon</button>
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.pokemonVisualCard}>
          <img src={selectedPokemon.image} alt={selectedPokemon.name} className={styles.pokemonImageLarge} />
          <span className={styles.label}>Nível</span>
          <input
            type="number"
            value={level}
            onChange={(e) => onLevelChange(Number.parseInt(e.target.value, 10) || 50)}
            min="1"
            max="100"
            className={styles.levelInput}
          />
        </div>

        <div className={styles.statsPanel}>
          <h4>Stats Efetivos</h4>
          <div className={styles.statsList}>
            {Object.entries(effective).map(([stat, value]) => (
              <div key={stat} className={styles.statRow}>
                <span className={styles.statLabel}>{getStatLabel(stat)}</span>
                <div className={styles.statTrack}>
                  <span
                    className={styles.statFill}
                    style={{ width: `${Math.min(100, Math.round((value / 300) * 100))}%` }}
                  />
                </div>
                <span className={styles.statValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.formsGrid}>
        <div className={`${styles.formCard} ${styles.movesSection}`}>
          <h4>Golpes</h4>
          <div className={styles.movesGrid}>
            {moveSlots.map((slotKey, i) => (
              <select
                key={slotKey}
                value={moves[i] || ''}
                onChange={(e) => onMoveChange(i, e.target.value)}
                className={styles.control}
              >
                <option value="">Selecione um golpe</option>
                {movesList.map((move) => (
                  <option key={move} value={move}>
                    {move}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className={`${styles.formCard} ${styles.abilitySection}`}>
          <h4>Habilidade</h4>
          <select
            value={ability || ''}
            onChange={(e) => onAbilityChange(e.target.value)}
            className={styles.control}
          >
            <option value="">Selecione uma habilidade</option>
            {abilitiesList.map((abilityName) => (
              <option key={abilityName} value={abilityName}>
                {abilityName}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.formCard} ${styles.itemSection}`}>
          <h4>Item Hold</h4>
          <select
            value={item || ''}
            onChange={(e) => onItemChange(e.target.value)}
            className={styles.control}
          >
            <option value="">Selecione um item</option>
            {itemsList.map((itemName) => (
              <option key={itemName} value={itemName}>
                {itemName}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.formCard} ${styles.ivsSection}`}>
          <h4>IVs</h4>
          <div className={styles.statInputsGrid}>
            {Object.keys(ivs).map(stat => (
              <div key={stat} className={styles.statInputRow}>
                <label className={styles.statInputLabel}>{getStatLabel(stat)}</label>
                <input
                  type="number"
                  value={ivs[stat]}
                  onChange={(e) => onIvChange(stat, Number.parseInt(e.target.value, 10) || 0)}
                  min="0"
                  max="31"
                  className={styles.input}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.formCard} ${styles.evsSection}`}>
          <h4>EVs</h4>
          <div className={styles.statInputsGrid}>
            {Object.keys(evs).map(stat => (
              <div key={stat} className={styles.statInputRow}>
                <label className={styles.statInputLabel}>{getStatLabel(stat)}</label>
                <input
                  type="number"
                  value={evs[stat]}
                  onChange={(e) => onEvChange(stat, Number.parseInt(e.target.value, 10) || 0)}
                  min="0"
                  max="255"
                  className={styles.input}
                />
              </div>
            ))}
          </div>
          <p className={styles.totalEvs}>Total EVs: {totalEvs}</p>
        </div>
      </div>
    </div>
  );
}

const statsShape = PropTypes.shape({
  hp: PropTypes.number,
  attack: PropTypes.number,
  defense: PropTypes.number,
  specialAttack: PropTypes.number,
  specialDefense: PropTypes.number,
  speed: PropTypes.number
});

PokemonDetails.propTypes = {
  selectedPokemon: PropTypes.shape({
    name: PropTypes.string.isRequired,
    image: PropTypes.string,
    types: PropTypes.arrayOf(PropTypes.string).isRequired,
    stats: statsShape
  }),
  level: PropTypes.number.isRequired,
  moves: PropTypes.arrayOf(PropTypes.string).isRequired,
  ability: PropTypes.string.isRequired,
  item: PropTypes.string.isRequired,
  ivs: statsShape.isRequired,
  evs: statsShape.isRequired,
  movesList: PropTypes.arrayOf(PropTypes.string).isRequired,
  abilitiesList: PropTypes.arrayOf(PropTypes.string).isRequired,
  itemsList: PropTypes.arrayOf(PropTypes.string).isRequired,
  onLevelChange: PropTypes.func.isRequired,
  onMoveChange: PropTypes.func.isRequired,
  onAbilityChange: PropTypes.func.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onIvChange: PropTypes.func.isRequired,
  onEvChange: PropTypes.func.isRequired,
  calculateEffectiveStats: PropTypes.func.isRequired,
  onClearPokemon: PropTypes.func.isRequired,
  onChangePokemon: PropTypes.func.isRequired
};
