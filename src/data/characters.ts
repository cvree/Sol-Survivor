/**
 * Things each astronaut says when the commander stops for a chat, a high five or a pep talk.
 * Made up for the game, to give everyone their own voice.
 */
export const CHAT: Record<string, string[]> = {
  ada: ['Gerald says hi. Gerald is my wrench.', 'If it rattles, I can fix it. If it does not rattle, give me a minute.', 'My dream? An Oxygen Maker that hums in tune.', 'I named the solar panels too. Do not tell them.'],
  mei: ['Deep breath in... and out. Good! Doctor’s orders.', 'I hum when I check heartbeats. Yours sounds like a drum solo.', 'Drink your water! Even on Mars. Especially on Mars.', 'Your heart does not care what planet it is on. It just keeps going.'],
  kofi: ['The lettuce told me a joke. It was a bit corny. Wait, that was the corn.', 'Plants need light, water, and someone to talk to. I am the talking part.', 'One day I will grow a strawberry on Mars. One perfect strawberry.', 'Have you ever smelled a tomato leaf? It smells like summer.'],
  yuki: ['I found a rock shaped like a cat. I am keeping it.', 'Every rock here is a page from a history book.', 'Can I go exploring? Please? Just one more rock?', 'Mount Sharp is my favourite. Do not tell the other mountains.'],
  luis: ['Coffee number four. Or five. Who is counting? Not me.', 'My experiment is going great. I think. The numbers are wiggly.', 'Science is just asking "why?" until something answers.', 'Space-dried coffee tastes like sad sand. I love it anyway.'],
  zara: ['I packed twelve rolls of tape. Now I have eleven. Progress!', 'Give me a building site and I am happy.', 'If tape cannot fix it, you did not use enough tape.', 'Race you to the next building site!'],
  omar: ['I counted my seeds. Then I fell asleep. Then I counted again.', 'My sock is still missing. I suspect the rover.', 'A nap is just a tiny holiday.', 'Wake me up when it is time to plant something.'],
  tala: ['Why did the astronaut need a ladder? To get to the high five!', 'What is a robot’s favourite snack? Micro-chips!', 'How do you throw a party on Mars? You planet!', 'Knock knock. Who is there? Mars. Mars who? Mars-ive hug!'],
};
export const HIGH_FIVE: Record<string, string> = {
  ada: 'Up high! Gerald wants one too.', mei: 'Gentle! I need these hands for check-ups.', kofi: 'Green-fingered high five!', yuki: 'Rock on!',
  luis: 'Whoa, that woke me up better than coffee!', zara: 'Ha! Stronger than tape!', omar: '...huh? Oh! Yes! High five!', tala: 'Up high, down low... too slow!',
};
export const PEP_TALK: Record<string, string> = {
  ada: 'You are right. We can fix anything together.', mei: 'Thank you, Commander. I feel calmer already.', kofi: 'You make me feel like a sunflower. Standing tall!', yuki: 'Okay! I am ready for anything. Even more rocks.',
  luis: 'That was better than any coffee. Let us do science!', zara: 'Let’s build something amazing!', omar: 'I am wide awake now. Wide. Awake.', tala: 'Aww. Okay, no jokes for one whole minute. Thank you.',
};
