import m from "mithril"
import Shadow from "~/components/shadow"
import Iframe from "~/components/iframe"

import TriInput from "~/components/input"
import TriStatus from "~/components/status"

import {ContentState, ContentActions} from "~/content"

export type ContentAttrs = {
    model: ContentState
    actions: ContentActions
}

export const App = {
    view: ({attrs: {model, actions}}) =>
        model.uiframe.visible &&
            m(Shadow, m(Iframe,
                {
                    src: browser.runtime.getURL("blank.html"),
                    style: {
                        position: "fixed",
                        bottom: 0,
                        border: 0,
                        padding: 0,
                        margin: 0,
                        width: "100%",
                    },
                },
                [
                    m("head", [
                        m("title", "Tridactyl Commandline"),
                        [
                            "static/css/commandline.css",
                            "static/themes/default/default.css",
                        ].map(url =>
                            m("link", {
                                href: browser.runtime.getURL(url),
                                rel: "stylesheet",
                            })
                        ),
                    ]),
                    m("body", [
                        // Can't stringify the whole model, probably because
                        // stringify does some magic and model contains a reference
                        // to the div that gets removed.
                        // m('pre', JSON.stringify(model)),
                        m("pre", JSON.stringify(model.uiframe.commandline)),
                        m(TriInput, { model, actions }),
                        m(TriStatus, { model, actions }),
                    ]),
                ]
            )),
}

export default App
