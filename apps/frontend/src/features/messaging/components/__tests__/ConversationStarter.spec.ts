import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { InteractionContextSchema } from '@zod/interaction/interactionContext.dto'
import type { OwnerProfile, PublicProfile } from '@zod/profile/profile.dto'

import ConversationStarter from '../ConversationStarter.vue'

const partner = {
  id: 'partner',
  publicName: 'Milán',
  profileImages: [],
  tags: [
    { id: 't1', name: 'Népzene', slug: 'nepzene' },
    { id: 't2', name: 'Táncház', slug: 'tanchaz' },
  ],
  languages: ['hu', 'en'],
} as unknown as PublicProfile
const viewer = {
  id: 'me',
  publicName: 'Me',
  profileImages: [],
  languages: ['hu', 'de'],
} as unknown as OwnerProfile

function mountStarter(
  contextOverrides?: Record<string, boolean>,
  profile = partner,
  viewerProfile: OwnerProfile | null = viewer
) {
  return mount(ConversationStarter, {
    props: {
      partner: profile,
      viewer: viewerProfile,
      context: contextOverrides ? InteractionContextSchema.parse(contextOverrides) : undefined,
    },
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, string>) =>
          params ? `${key}:${params.name}` : key,
      },
      stubs: {
        MatchPair: {
          name: 'MatchPair',
          props: ['left', 'right'],
          template: '<div class="pair" />',
        },
        RevealedLikeCard: { props: ['profile'], template: '<div class="like" />' },
        LanguageList: {
          name: 'LanguageList',
          props: ['languages'],
          template: '<ul class="langs" />',
        },
        TagList: {
          props: ['tags'],
          template: '<ul><li v-for="t in tags" :key="t.id">{{ t.name }}</li></ul>',
        },
      },
    },
  })
}

describe('ConversationStarter', () => {
  it('shows the pair of profiles and their mutual smile on a match', () => {
    const wrapper = mountStarter({ isMatch: true, likedByMe: true, likedMeRevealed: true })

    const pair = wrapper.findComponent({ name: 'MatchPair' })
    expect(pair.props('left')).toEqual(viewer)
    expect(pair.props('right')).toEqual(partner)
    expect(wrapper.find('[data-testid="starter-match"]').text()).toContain(
      'interactions.you_smiled_at_each_other:Milán'
    )
    expect(wrapper.find('[data-testid="starter-like"]').exists()).toBe(false)
  })

  it('shows the smile the viewer sent', () => {
    const wrapper = mountStarter({ likedByMe: true })

    const like = wrapper.find('[data-testid="starter-like"]')
    expect(like.find('.like').exists()).toBe(true)
    expect(like.text()).toContain('interactions.you_smiled_at:Milán')
    expect(wrapper.find('.pair').exists()).toBe(false)
  })

  it('shows the smile the partner sent', () => {
    const wrapper = mountStarter({ likedMeRevealed: true })

    expect(wrapper.find('[data-testid="starter-like"]').text()).toContain(
      'interactions.name_smiled_at_you:Milán'
    )
  })

  it('shows no match or smile without one, or before the context loads', () => {
    for (const wrapper of [mountStarter({}), mountStarter()]) {
      expect(wrapper.find('.pair').exists()).toBe(false)
      expect(wrapper.find('[data-testid="starter-like"]').exists()).toBe(false)
    }
  })

  it("lists the partner's interests under a heading", () => {
    const tags = mountStarter().find('[data-testid="starter-tags"]')

    expect(tags.find('h6').text()).toBe('messaging.partner_interests:Milán')
    expect(tags.findAll('li').map((li) => li.text())).toEqual(['Népzene', 'Táncház'])
  })

  it('leaves out the interests when the partner has none', () => {
    const wrapper = mountStarter(undefined, { ...partner, tags: [] } as PublicProfile)

    expect(wrapper.find('[data-testid="starter-tags"]').exists()).toBe(false)
  })

  it("lists the partner's languages under a label", () => {
    const languages = mountStarter().find('[data-testid="starter-languages"]')

    expect(languages.text()).toContain('messaging.partner_languages')
    expect(languages.findComponent({ name: 'LanguageList' }).props('languages')).toEqual([
      'hu',
      'en',
    ])
  })

  it('leaves out the languages when the partner has none', () => {
    const wrapper = mountStarter(undefined, { ...partner, languages: [] } as PublicProfile)

    expect(wrapper.find('[data-testid="starter-languages"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="starter-tags"]').exists()).toBe(true)
  })

  it('leaves out the languages when the viewer speaks only one, which the partner shares', () => {
    const monolingual = { ...viewer, languages: ['hu'] } as OwnerProfile
    const wrapper = mountStarter(undefined, partner, monolingual)

    expect(wrapper.find('[data-testid="starter-languages"]').exists()).toBe(false)
  })

  it("lists all the partner's languages in every other case", () => {
    const viewers = [
      { ...viewer, languages: ['de'] },
      { ...viewer, languages: ['hu', 'en'] },
      { ...viewer, languages: [] },
      null,
    ] as (OwnerProfile | null)[]
    for (const v of viewers) {
      const list = mountStarter(undefined, partner, v)
        .find('[data-testid="starter-languages"]')
        .findComponent({ name: 'LanguageList' })
      expect(list.props('languages')).toEqual(['hu', 'en'])
    }
  })

  it('explains the one-first-message rule outside a match', () => {
    for (const wrapper of [mountStarter(), mountStarter({}), mountStarter({ likedByMe: true })]) {
      expect(wrapper.find('[data-testid="starter-first-message"]').text()).toBe(
        'messaging.first_message_rule:Milán'
      )
    }
  })

  it('leaves out the rule on a match, which opens the conversation fully', () => {
    const wrapper = mountStarter({ isMatch: true, likedByMe: true, likedMeRevealed: true })

    expect(wrapper.find('[data-testid="starter-first-message"]').exists()).toBe(false)
  })
})
