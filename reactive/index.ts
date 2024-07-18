/**
 * Modified from https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts
 */
type SignalState<T> = {
    value: T
    observers: Computation<any>[] | null
    observerSlots: number[] | null
}

type Accessor<T> = () => T
// TODO
type Setter<T> = {
    <U extends T>(value: (prev: T) => U): U
    <U extends T>(value: Exclude<U, Function>): U
}
type Signal<T> = [get: Accessor<T>, set: Setter<T>]
type EffectFunction<Prev, Next> = (prev: Prev) => Next

let Listener: Computation<any> | null = null
let Effects: Computation<any>[] | null = null

const INIT = 0 as const
const STALE = 1 as const
const PENDING = 2 as const

type ComputationState = typeof INIT | typeof STALE | typeof PENDING
type Computation<Init, Next extends Init = Init> = {
    fn: EffectFunction<Init, Next>
    state: ComputationState
    sources: SignalState<Next>[] | null
    sourceSlots: number[] | null
    value?: Init
}

export function createEffect<Next>(fn: EffectFunction<undefined, Next>) {
    const c = createComputation(fn)

    if (Effects) {
        Effects.push(c)
    } else {
        runComputation(c)
    }
}

// TODO: node:Owner
function cleanNode(node: Computation<any>) {
    if (node.sources) {
        while (node.sources?.length) {
            const source = node.sources.pop()
            const index = node.sourceSlots.pop()
            const obs = source.observers

            if (obs?.length) {
                const n = obs.pop()
                const s = source.observerSlots.pop()

                if (index < obs.length) {
                    n.sourceSlots[s] = index
                    obs[index] = n
                    source.observerSlots[index] = s
                }
            }
        }
    }

    node.state = INIT
}

function runTop(node: Computation<any>) {
    if (node.state === INIT) {
        return
    }

    const ancestors = [node]

    for (let i = ancestors.length - 1; i >= 0; i--) {
        node = ancestors[i]

        if (node.state === STALE) {
            updateComputation(node)
        }
    }
}

function runEffects(queue: Computation<any>[]) {
    for (let i = 0; i < queue.length; i++) {
        runTop(queue[i])
    }
}

function createComputation<Next, Init = unknown>(fn: EffectFunction<Init, Next>) {
    const c: Computation<Init | Next, Next> = {
        fn,
        state: INIT,
        sources: null,
        sourceSlots: null,
        value: undefined // TODO
    }

    return c
}

function updateComputation(node: Computation<any>) {
    if (!node.fn) {
        return
    }

    cleanNode(node)
    runComputation(node, node.value)
}

function runComputation(node: Computation<any>, value?: any) {
    const listener = Listener
    Listener = node

    let nextValue: any

    try {
        nextValue = node.fn(value)
    } catch (e) {
        console.log(e)
    } finally {
        Listener = listener
    }

    node.value = nextValue
}

function completeUpdates(wait: boolean) {
    if (wait) {
        return
    }

    const e = Effects
    Effects = null

    if (e?.length) {
        runUpdates(() => runEffects(e))
    }
}

function runUpdates<T>(fn: () => T) {
    let wait = false

    if (Effects) {
        wait = true
    } else {
        Effects = []
    }

    try {
        const res = fn()
        completeUpdates(wait)
        return res
    } catch (e) {
        console.log(e)
    }
}

function readSignal<T>(this: SignalState<T>) {
    if (Listener) {
        const sSlot = this.observers ? this.observers.length : 0

        if (!Listener.sources) {
            Listener.sources = [this]
            Listener.sourceSlots = [sSlot]
        } else {
            Listener.sources.push(this)
            Listener.sourceSlots.push(sSlot)
        }

        if (!this.observers) {
            this.observers = [Listener]
            this.observerSlots = [Listener.sources.length - 1]
        } else {
            this.observers.push(Listener)
            this.observerSlots.push(Listener.sources.length - 1)
        }
    }

    return this.value
}

function writeSignal<T>(this: SignalState<T>, value: (preValue: T) => T)
function writeSignal<T>(this: SignalState<T>, value: T) {
    let newValue = this.value

    if (typeof value === 'function') {
        newValue = value(newValue)
    } else {
        newValue = value
    }

    if (this.value !== newValue) {
        this.value = newValue

        runUpdates(() => {
            if (this.observers?.length > 0) {
                for (let i = 0; i < this.observers.length; i++) {
                    const c = this.observers[i]

                    if (c.state === INIT) {
                        Effects.push(c)
                    }

                    c.state = STALE
                }
            }
        })
    }
    return newValue
}

export function createSignal<T>(initValue: T): Signal<T> {
    const state = {
        value: initValue,
        observers: null,
        observerSlots: null
    }

    return [readSignal.bind(state), writeSignal.bind(state)]
}
