import produce from "immer"
import flyd from "flyd"
import m from "mithril"

import App from "~/components/app"

import { KeyseqState, keyseqActions, KeyseqInitial } from "~/keyseq/state"

/*
 * Meiosis demo in typescript with immutable state.
 *
 * Patchinko was considered, but the type definitions aren't as good.
 *
 * Immutable.js was originally used, but the type checking for deep edits isn't
 * as good as for immer.
 *
 * The actions are a bit verbose, but less so than redux and we could write
 * some helpers or adapt something like patchinko to make it less so.
 */

/**** TYPES ****/

type ModeType = "normal" | "ignore"

// KeySeq and Mode states could trivially be moved elsewhere if that becomes useful.

// Readonly is not recursive, but that's OK
export type ContentState = Readonly<{
    keyseq: KeyseqState
    mode: {
        current: ModeType
        previous?: ModeType
    }
    uiframe: {
        visible: boolean
        commandline: {
            visible: boolean
            history: string[]
            text: string
        }
        statusbar: {
            visible: boolean
        }
        completions: {
            visible: boolean
        }
    }
}>

const initial: ContentState = {
    keyseq: KeyseqInitial,
    mode: {
        current: "normal",
    },
    uiframe: {
        visible: false,
        commandline: {
            visible: false,
            history: [],
            text: "",
        },
        statusbar: {
            visible: false,
        },
        completions: {
            visible: false,
        },
    },
}

export type Updater = (model: ContentState) => ContentState

export type Updates = flyd.Stream<Updater>
export type Models = flyd.Stream<ContentState>

export type Actions = {
    [key: string]: Updater
}

export function dispatch(updater: Updater) {
    updates(updater)
}

/**** Actions ****/

// Helper functions to make using produce a bit less frustrating.
export type Mutator = (model: ContentState) => void
export const mutator = (fn: Mutator) => (model: ContentState) =>
    produce(model, fn)

// Imagine these are bigger and maybe imported from different files.
const modeActions = {
    change_mode: (newmode: ModeType) =>
        mutator(({ mode }) => {
            mode.current = newmode
        }),
}

const createActions = (updates: Updates) => ({
    // : { [key: string]: Actions } => ({
    mode: modeActions,
    keyseq: keyseqActions,
    uiframe: {
        oninput: (val: string) =>
            mutator(({ uiframe }) => {
                uiframe.commandline.text = val
            }),
        setvisible: (vis: boolean) =>
            mutator(({ uiframe }) => {
                uiframe.visible = vis
            }),
    },
})

// If we ever need state/actions that require a dynamic key in the state object.
// const moveableActions = (updates: Updates, id: keyof State) => ({
//     someaction: () => updates(model =>
//      produce(model, ({[id]}) => void (id.foo = 1)))
// })

/**** Meiosis setup ****/

const updates: Updates = flyd.stream()
const models: Models = flyd.scan(
    (state: ContentState, fn: Updater) => fn(state),
    initial,
    updates
)

let actions = createActions(updates)

// Debugging: Print info about each action
const voidfn = () => {}
function nestingactionproxy(target) {
    return new Proxy(voidfn, {
        get: (_, name: string) => nestingactionproxy(target[name]),
        apply: (_, __, args: any[]) => {
            const response = target(...args)
            response._meta = {}
            response._meta.fn = target
            response._meta.args = args
            return response
        },
    }) as any
}
actions = nestingactionproxy(actions)
updates.map((act: any) => console.log(act._meta.fn, act._meta.args))

export type ContentActions = typeof actions

// Views

// models.map(m => console.log(m.uiframe, m.mode, m.keyseq))
// models.map(m => console.log(m.keyseq.keys))

// HTML views

/**
 * Render all of our visible UI.
 *
 * The App component returns an empty vnode if it should not be displayed. This
 * lets mithril manage the dom nodes however it wants to.
 *
 * If it should be displayed, it renders into a shadow root attached to a newly
 * created element on the documentElement that is managed by the 'Shadow' component.
 *
 * The App should not be m.mount'ed because there's no need and the Shadow does
 * not have an onupdate hook.
 */
const fakeroot = document.createElement("div")

models.map(model => m.render(fakeroot, [m(App, { model, actions })]))

// Listeners

addEventListener("keydown", (ke: KeyboardEvent) =>
    dispatch(actions.keyseq.keydown(ke.key))
)
addEventListener(
    "keydown",
    (ke: KeyboardEvent) =>
        ke.key === "t" &&
        (document.location.href = browser.runtime.getURL("test.html"))
)

// RPC

import * as rpc from "~/rpc"

export const rpcexports = {
    stat: async () => models().mode.current,
    nada: async () => 42,
    err: () => {
        throw Error("hi there")
    },
}

browser.runtime.onMessage.addListener(rpc.onMessage(rpcexports))

addEventListener(
    "keydown",
    ke => ke.key === "x" && rpc.rpc("background").nada()
)

addEventListener(
    "keydown",
    ke => ke.key === "c" && rpc.rpc("background").submod.val(1)
)

addEventListener(
    "keydown",
    ke =>
        ke.key === "o" &&
        dispatch(actions.uiframe.setvisible(!models().uiframe.visible))
)

Object.assign(window as any, {
    rpc,
})

export type ContentAttrs = {
    model: ContentState
    actions: ContentActions
}
