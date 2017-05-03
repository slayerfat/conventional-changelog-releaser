import {expect} from 'chai';
import {Releaser} from '../src/Releaser';

let releaser: Releaser;

describe('Greeter', () => {
  beforeEach(() => releaser = new Releaser());

  it('should sadly greet', () => {
    expect(releaser).to.be.ok;
  });
});
