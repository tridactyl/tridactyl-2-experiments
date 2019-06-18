import m from 'mithril'

/**
 * Mount the children of this vnode in a shadowroot attached to `shadowOf`
 */
export const Shadow = () => {
    let root = undefined
    return {
        oncreate: ({dom, attrs: { shadowOf = document.documentElement, mode = 'closed' as ShadowRootMode } }) => {
            let shadowroot
            // Can't attach directly to document.documentElement, so handle that specially.
            if (shadowOf === document.documentElement) {
                root = shadowOf.appendChild(document.createElement('body'))
                shadowroot = root.attachShadow({mode})
            } else {
                shadowroot = shadowOf.attachShadow({mode})
            }
            shadowroot.appendChild(dom)
        },
        // Remove the intermediate root added if we want to attach to documentElement.
        onremove: () => root ? root.remove() : null,

        // The div will be attached to the shadowRoot.
        view: vnode => m(
            'div',
            // These styles reset the position of the element to the top left of the page
            // and isolate us from any inheritable css in the web content.
            { style: 'all: initial; position: absolute; top: 0; left: 0;' },
            vnode.children)
    }
}

export default Shadow
