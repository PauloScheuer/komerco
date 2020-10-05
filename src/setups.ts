const setups: any = {
  mine: {
    entry: {
      price: 'max',
      conditions: [
        ['open', '<', 'ma9'],
        ['close', '>', 'ma9'],
      ],
    },
    out: {
      fix: false,
      price: 'min',
      gain: 99,
      conditions: [
        ['open', '>', 'ma9'],
        ['close', '<', 'ma9'],
      ],
    },
  },
  crossing: {
    entry: {
      price: 'close',
      conditions: [
        ['ma9', '>', 'ma50'],
        ['odbma9', '<', 'odbma50'],
        ['ma21', '>', 'odbma21'],
      ],
    },
    out: {
      fix: false,
      gain: 99,
      price: 'null', //maior parte das perdas é no stop inicial
      conditions: [['ma21', '<', 'odbma21']],
    },
  },
  larryWilliams: {
    entry: {
      price: 'max',
      conditions: [
        ['ma9', '>', 'odbma9'],
        ['odbma9', '<', 'tdbma9'],
      ],
    },
    out: {
      fix: false,
      price: 'min',
      gain: 99,
      conditions: [
        ['ma9', '<', 'odbma9'],
        ['odbma9', '>', 'tdbma9'],
      ],
    },
  },
  123: {
    entry: {
      price: 'max',
      conditions: [
        ['min', '>', 'odbmin'],
        ['odbmin', '<', 'tdbmin'],
        ['ma9', '>', 'odbma9'],
        ['ma21', '>', 'odbma21'],
        ['ma50', '>', 'odbma50'],
      ],
    },
    out: {
      fix: true,
      loss: 'odbmin',
      gain: 2,
    },
  },
  daveLandry: {
    entry: {
      price: 'max',
      conditions: [
        ['min', '<', 'odbmin'],
        ['min', '<', 'tdbmin'],
        ['ma9', '>', 'odbma9'],
        ['ma21', '>', 'odbma21'],
        ['ma50', '>', 'odbma50'],
      ],
    },
    out: {
      fix: true,
      loss: 'min',
      gain: 2,
    },
  },
  insidebar: {
    entry: {
      price: 'max',
      conditions: [
        ['min', '>', 'odbmin'],
        ['max', '<', 'odbmax'],
        ['ma9', '>', 'odbma9'],
        ['ma21', '>', 'odbma21'],
        ['ma50', '>', 'odbma50'],
      ],
    },
    out: {
      fix: true,
      loss: 'odbmin',
      gain: 2,
    },
  },
};

export default setups;
