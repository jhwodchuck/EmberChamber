#!/usr/bin/env python3
"""
Patch Expo iOS node_modules for Xcode 16.4 compatibility.

Run from the repository root after `npm ci` so that node_modules exist.
Exits non-zero and prints a diagnostic if any expected source fragment is
missing (indicating the patch target has changed and this script needs an
update).
"""
from pathlib import Path
import sys


def block(*lines):
    return "\n".join(lines)


replacements = [
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/Core/Views/ViewDefinition.swift"),
        "extension UIView: @MainActor AnyArgument {",
        "extension UIView: AnyArgument {",
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIHostingView.swift"),
        "  public final class HostingView<Props: ViewProps, ContentView: View<Props>>: ExpoView, @MainActor AnyExpoSwiftUIHostingView {",
        "  public final class HostingView<Props: ViewProps, ContentView: View<Props>>: ExpoView, AnyExpoSwiftUIHostingView {",
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift"),
        block(
            "    override func mountChildComponentView(_ childComponentView: UIView, index: Int) {",
            "      var children = props.children ?? []",
            "      let child: any AnyChild",
            "      if let view = childComponentView as AnyObject as? (any ExpoSwiftUI.View) {",
            "        child = view",
            "      } else {",
            "        child = UIViewHost(view: childComponentView)",
            "      }",
            "      children.insert(child, at: index)",
            "",
            "      props.children = children",
            "      props.objectWillChange.send()",
            "    }",
        ),
        block(
            "    override func mountChildComponentView(_ childComponentView: UIView, index: Int) {",
            "      performSynchronouslyOnMainActor {",
            "        var children = props.children ?? []",
            "        let child: any AnyChild",
            "        if let view = childComponentView as AnyObject as? (any ExpoSwiftUI.View) {",
            "          child = view",
            "        } else {",
            "          child = UIViewHost(view: childComponentView)",
            "        }",
            "        children.insert(child, at: index)",
            "",
            "        props.children = children",
            "        props.objectWillChange.send()",
            "      }",
            "    }",
        ),
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift"),
        block(
            "    override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {",
            "      // Make sure the view has no superview, React Native asserts against this.",
            "      childComponentView.removeFromSuperview()",
            "",
            "      let childViewId: ObjectIdentifier",
            "      if let child = childComponentView as AnyObject as? (any AnyChild) {",
            "        childViewId = child.id",
            "      } else {",
            "        childViewId = ObjectIdentifier(childComponentView)",
            "      }",
            "",
            "      if let children = props.children {",
            "        props.children = children.filter({ $0.id != childViewId })",
            "        #if DEBUG",
            '        assert(props.children?.count == children.count - 1, "Failed to remove child view")',
            "        #endif",
            "        props.objectWillChange.send()",
            "      }",
            "    }",
        ),
        block(
            "    override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {",
            "      performSynchronouslyOnMainActor {",
            "        // Make sure the view has no superview, React Native asserts against this.",
            "        childComponentView.removeFromSuperview()",
            "",
            "        let childViewId: ObjectIdentifier",
            "        if let child = childComponentView as AnyObject as? (any AnyChild) {",
            "          childViewId = child.id",
            "        } else {",
            "          childViewId = ObjectIdentifier(childComponentView)",
            "        }",
            "",
            "        if let children = props.children {",
            "          props.children = children.filter({ $0.id != childViewId })",
            "          #if DEBUG",
            '          assert(props.children?.count == children.count - 1, "Failed to remove child view")',
            "          #endif",
            "          props.objectWillChange.send()",
            "        }",
            "      }",
            "    }",
        ),
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift"),
        block(
            "    override func removeFromSuperview() {",
            "      // When the view is unmounted, the focus on TextFieldView stays active and it causes a crash, so we blur it here",
            "      // UIView does something similar to resign the first responder in removeFromSuperview, so we do the same for our virtual view",
            "      if let focusableView = contentView as? any ExpoSwiftUI.FocusableView {",
            "        focusableView.forceResignFirstResponder()",
            "      }",
            "      super.removeFromSuperview()",
            "    }",
        ),
        block(
            "    override func removeFromSuperview() {",
            "      performSynchronouslyOnMainActor {",
            "        // When the view is unmounted, the focus on TextFieldView stays active and it causes a crash, so we blur it here",
            "        // UIView does something similar to resign the first responder in removeFromSuperview, so we do the same for our virtual view",
            "        if let focusableView = contentView as? any ExpoSwiftUI.FocusableView {",
            "          focusableView.forceResignFirstResponder()",
            "        }",
            "        super.removeFromSuperview()",
            "      }",
            "    }",
        ),
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift"),
        block(
            "extension ExpoSwiftUI.SwiftUIVirtualView: @MainActor ExpoSwiftUI.ViewWrapper {",
            "  func getWrappedView() -> Any {",
            "    if let wrapper = contentView as? ExpoSwiftUI.ViewWrapper {",
            "      return wrapper.getWrappedView()",
            "    }",
            "    return contentView",
            "  }",
            "}",
        ),
        block(
            "extension ExpoSwiftUI.SwiftUIVirtualView: ExpoSwiftUI.ViewWrapper {",
            "  func getWrappedView() -> Any {",
            "    let result: NonisolatedUnsafeVar<Any> = performSynchronouslyOnMainActor {",
            "      let wrappedView: Any",
            "      if let wrapper = contentView as? ExpoSwiftUI.ViewWrapper {",
            "        wrappedView = wrapper.getWrappedView()",
            "      } else {",
            "        wrappedView = contentView",
            "      }",
            "      return NonisolatedUnsafeVar(wrappedView)",
            "    }",
            "    return result.value",
            "  }",
            "}",
        ),
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/DevTools/URLAuthenticationChallengeForwardSender.swift"),
        "internal final class URLAuthenticationChallengeForwardSender: NSObject, URLAuthenticationChallengeSender {",
        "internal final class URLAuthenticationChallengeForwardSender: NSObject, URLAuthenticationChallengeSender, @unchecked Sendable {",
    ),
    (
        Path("apps/mobile/node_modules/expo-modules-core/ios/DevTools/URLSessionSessionDelegateProxy.swift"),
        "public final class URLSessionSessionDelegateProxy: NSObject, URLSessionDataDelegate {",
        "public final class URLSessionSessionDelegateProxy: NSObject, URLSessionDataDelegate, @unchecked Sendable {",
    ),
    (
        Path("apps/mobile/node_modules/expo-notifications/ios/ExpoNotifications/Notifications/DateComponentsSerializer.swift"),
        block(
            '    if #available(iOS 26.0, *) {',
            '      serializedComponents["isRepeatedDay"] = dateComponents.isRepeatedDay ?? false',
            '    }',
        ),
        '    serializedComponents["isRepeatedDay"] = false',
    ),
    (
        Path("apps/mobile/node_modules/expo-image-picker/ios/MediaHandler.swift"),
        "      asset?.contentType ?? UTType(filenameExtension: fileExtension)",
        "      UTType(filenameExtension: fileExtension)",
    ),
    (
        Path("apps/mobile/node_modules/expo-image-picker/ios/MediaHandler.swift"),
        "      resource.contentType",
        "      UTType(resource.uniformTypeIdentifier) ?? UTType(filenameExtension: fileExtension)",
    ),
]

for path, old, new in replacements:
    src = path.read_text()
    if old not in src:
        print(f"ERROR: expected source fragment not found in {path}", file=sys.stderr)
        print(f"  Fragment: {old[:80]!r}…", file=sys.stderr)
        sys.exit(1)
    path.write_text(src.replace(old, new, 1))
    print(f"patched {path}")
