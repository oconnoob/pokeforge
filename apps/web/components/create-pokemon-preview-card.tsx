import { SpriteImage } from "@/components/sprite-image";

interface CreatePokemonPreviewCardProps {
  name: string;
  primaryType: string;
  secondaryType?: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  frontSprite: string;
}

const toPercent = (value: number) => Math.max(0, Math.min(100, Math.round((value / 180) * 100)));

export function CreatePokemonPreviewCard({
  name,
  primaryType,
  secondaryType,
  hp,
  attack,
  defense,
  speed,
  frontSprite
}: CreatePokemonPreviewCardProps) {
  return (
    <article className="pokemon-card create-result-card">
      <div className="create-result-layout">
        <section className="create-result-left">
          <h3>{name}</h3>
          <SpriteImage src={frontSprite} alt={`${name} front`} width={192} height={192} />
        </section>

        <section className="create-result-right">
          <div className="pokemon-stats-row create-result-stats">
            <div className="stat-item stat-hp">
              <span className="stat-label">HP {hp}</span>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: `${toPercent(hp)}%` }} />
              </div>
            </div>
            <div className="stat-item stat-atk">
              <span className="stat-label">ATK {attack}</span>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: `${toPercent(attack)}%` }} />
              </div>
            </div>
            <div className="stat-item stat-def">
              <span className="stat-label">DEF {defense}</span>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: `${toPercent(defense)}%` }} />
              </div>
            </div>
            <div className="stat-item stat-spd">
              <span className="stat-label">SPD {speed}</span>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: `${toPercent(speed)}%` }} />
              </div>
            </div>
          </div>

          <div className="type-badges create-result-badges">
            <span className={`type-chip type-${primaryType}`}>{primaryType}</span>
            {secondaryType ? <span className={`type-chip type-${secondaryType}`}>{secondaryType}</span> : null}
          </div>
        </section>
      </div>
    </article>
  );
}
