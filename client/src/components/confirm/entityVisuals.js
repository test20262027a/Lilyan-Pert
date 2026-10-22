/*
 * Contextual identity of every deletable record.
 *
 * One entry per entity the admin panel can delete: the large icon inside the
 * dialog's raised circle, its pastel tone and the default title / question.
 * The tone is the entity's own meaning (products pink, tables violet, reviews
 * teal, …) — it is deliberately NOT the business theme, so the dialog keeps the
 * identity of what is being deleted whatever appearance is selected. Only the
 * modal surface, borders and the Cancel button follow the theme.
 *
 * Pages may override any of it (a category passes its own saved glyph, a
 * product passes its own thumbnail); the entry is the fallback, never a
 * hardcoded record.
 */
export const ENTITY_VISUALS = {
  category: {
    icon: 'utensils',
    tone: 'pink',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  product: {
    icon: 'package',
    tone: 'coral',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  order: {
    icon: 'receipt',
    tone: 'coral',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  asset: {
    icon: 'image',
    tone: 'pink',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  table: {
    icon: 'table',
    tone: 'violet',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  promotion: {
    icon: 'percent',
    tone: 'green',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  ad: {
    icon: 'megaphone',
    tone: 'violet',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  review: {
    icon: 'message',
    tone: 'teal',
    titleKey: 'review_delete_title',
    messageKey: 'delete_generic_question',
  },
  activity: {
    icon: 'history',
    tone: 'cyan',
    titleKey: 'act_delete_title',
    messageKey: 'act_delete_message',
  },
  user: {
    icon: 'userMinus',
    tone: 'blue',
    titleKey: 'delete_title_user',
    messageKey: 'delete_user_question',
  },
  backup: {
    icon: 'database',
    tone: 'blue',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
  reset: {
    icon: 'database',
    tone: 'amber',
    titleKey: 'reset_confirm_title',
    messageKey: 'reset_confirm_lead',
  },
  generic: {
    icon: 'trash',
    tone: 'pink',
    titleKey: 'delete_title_generic',
    messageKey: 'delete_generic_question',
  },
};

export function entityVisual(entityType) {
  return ENTITY_VISUALS[entityType] || ENTITY_VISUALS.generic;
}
