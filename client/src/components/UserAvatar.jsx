import { useEffect, useRef, useState } from 'react';
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

/*
 * Photos already decoded in this session.
 *
 * A media reference is immutable, so the same URL always means the same pixels.
 * Remembering it lets a remount (a navigation, a panel reopening) paint the
 * photo on its very first frame instead of fading it in again from an empty
 * circle — the avatar never blanks out twice for one image. It holds URLs, not
 * people: the reference itself is what changes when a photo changes.
 */
const DECODED = new Set();

export default function UserAvatar({
  user,
  src,
  avatarType,
  size = 40,
  className = '',
  alt = '',
  priority = false,
}) {
  const photo = src !== undefined ? src : user?.profile_image_url;
  const type = avatarType !== undefined ? avatarType : user?.avatar_type;
  const kind = ICONS[type] ? type : 'default';
  const imgRef = useRef(null);

  /* A photo already decoded in this session starts visible: the first paint is
     the picture, not a placeholder that fades in a moment later. */
  const [loaded, setLoaded] = useState(Boolean(photo) && DECODED.has(photo));
  const [broken, setBroken] = useState(false);

  /*
   * A new reference is a new image, so it starts over — but an image that is
   * already complete (served from the browser cache within this same mount)
   * reports it here instead of waiting for a load event that has already
   * fired. That gap is what left the frame empty on a fast connection.
   */
  useEffect(() => {
    setBroken(false);
    if (!photo) {
      setLoaded(false);
      return;
    }
    if (DECODED.has(photo)) {
      setLoaded(true);
      return;
    }
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      DECODED.add(photo);
      setLoaded(true);
      return;
    }
    setLoaded(false);
  }, [photo]);

  const ready = () => {
    if (photo) DECODED.add(photo);
    setLoaded(true);
  };

  const showPhoto = Boolean(photo) && !broken;

  return (
    <span
      className={`uavatar uavatar--${kind} ${className}`.trim()}
      style={{ '--uavatar-size': `${size}px` }}
      data-loading={showPhoto && !loaded ? 'true' : undefined}
    >
      {showPhoto ? (
        <img
          ref={imgRef}
          className={`uavatar__img ${loaded ? 'is-loaded' : ''}`.trim()}
          src={photo}
          alt={alt}
          /* The frame is the person's own identity, so it never waits for a
             scroll position: it is requested with the rest of the shell. */
          loading="eager"
          decoding="async"
          /* Lowercase on purpose: React 18 does not know the camelCase
             `fetchPriority` prop and warns about it, while the lowercase
             attribute is passed straight through to the DOM. */
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={ready}
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
