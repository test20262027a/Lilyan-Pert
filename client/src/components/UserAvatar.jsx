import { useEffect, useState } from 'react';
import Icon from './Icon';
import AvatarFigure from './AvatarFigure';
import './userAvatar.css';

/*
 * One user avatar, everywhere.
 *
 * The display order is fixed and shared by every surface that shows a person —
 * the User Management list, the Add/Edit form preview, the account menu and the
 * own-profile dialog:
 *
 *   1. the uploaded photo, when one is stored,
 *   2. otherwise the selected fallback silhouette (male / female),
 *   3. otherwise the neutral person glyph.
 *
 * The photo reference and the avatar choice are independent columns, so removing
 * a photo falls back to the avatar that was kept all along. A photo that fails to
 * load is treated exactly like a missing one — never a broken image icon. All
 * colours come from the active theme, so the frame follows Ocean / Forest /
 * Sunset / Midnight Purple with no hardcoded accent.
 */

const ICONS = { male: 'personMale', female: 'personFemale', default: 'person' };

export default function UserAvatar({
  user,
  src,
  avatarType,
  size = 40,
  className = '',
  alt = '',
}) {
  const photo = src !== undefined ? src : user?.profile_image_url;
  const type = avatarType !== undefined ? avatarType : user?.avatar_type;
  const kind = ICONS[type] ? type : 'default';

  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  // A new reference is a new image: start its loading state over.
  useEffect(() => {
    setLoaded(false);
    setBroken(false);
  }, [photo]);

  const showPhoto = Boolean(photo) && !broken;

  return (
    <span
      className={`uavatar uavatar--${kind} ${className}`.trim()}
      style={{ '--uavatar-size': `${size}px` }}
      data-loading={showPhoto && !loaded ? 'true' : undefined}
    >
      {showPhoto ? (
        <img
          className={`uavatar__img ${loaded ? 'is-loaded' : ''}`.trim()}
          src={photo}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
        />
      ) : kind === 'default' ? (
        <Icon name={ICONS.default} size={Math.round(size * 0.56)} className="uavatar__glyph" />
      ) : (
        // The chosen illustrated portrait fills the circle edge to edge.
        <AvatarFigure kind={kind} />
      )}
    </span>
  );
}
