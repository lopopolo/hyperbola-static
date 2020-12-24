---
title: "Source-level Polymorphism in Rust"
publishDate: "2020-12-24"
slug: source-level-polymorphism
summary: >-
  Interface compatibility does not require implementing an interface or a trait.
  Use compile-time flags and source-compatible APIs to swap out implementations.
---

[Artichoke Ruby] is a Ruby [implemented in Rust]. As Artichoke
[strangles][strangler-fig] its [mruby] core, I've been capturing core data
structures from the VM into Rust code.

Artichoke is a Cargo workspace and uses separate crates for implementing the
data structures that back Ruby Core APIs.

Splitting core data structures into their own crates helps me ensure they are
high quality. For example, crates [fail CI if they have missing documentation].
Using a separate crate for each data structure also makes it easier to have
multiple implementations of the API.

### Multiple Implementations

Having multiple implementations of core data structures allows Artichoke to be
built with different use cases in mind. For example, Artichoke distributes a
`ruby` CLI frontend that should allow users to interact with the host system;
but Artichoke also aims to support embedding use cases which may wish to limit
the ways the interpreter may interact with the host system. `VISION.md` expounds
on [Artichoke's design and goals][vision].

#### Array

[`spinoso-array`] is the crate that implements the contiguous buffer type that
backs [Ruby `Array`]. Using conditional compilation with [cargo features],
`spinoso-array` by default exposes two concrete buffer types:
[`Array`][spinoso-array-array], which is backed by a Rust [`Vec`], and
[`SmallArray`][spinoso-array-smallarray], which is backed by a [`SmallVec`].

`spinoso-array` does not have a trait that unifies these two types to ensure
they can be used interchangeably. Instead, these structs implement the exact
same API. Flipping between implementations is as simple as changing an import:

```rust
use spinoso_array::Array as SpinosoArray;
// or
use spinoso_array::SmallArray as SpinosoArray;
```

#### ENV

Another data structure that implements the multiple backend pattern is
Artichoke's access to environment variables. [`spinoso-env`] implements multiple
types that expose an identical API for accessing the environment:

- [`System`][spinoso-env-system] is a wrapper around [`std::env`] and gives Ruby
  code access to the platform environment variables via native APIs.
- [`Memory`][spinoso-env-memory] is a wrapper around a [`HashMap`], which allows
  Ruby code to have a functional [`ENV`][ruby-env] in environments where mutable
  access to the host system's environment is undesirable (if embedding Artichoke
  in another application) or unavailable (if building for e.g. the
  `wasm32-unknown-unknown` target).

The Artichoke VM is [configurable at compile-time][env-feature] to select the
`ENV` backend:

```toml
[features]
# Enable resolving environment variables with the `ENV` core object.
core-env = ["spinoso-env"]
# Enable resolving environment variables with the `ENV` core object using native
# OS APIs. This feature replaces the in-memory backend with `std::env`.
core-env-system = ["core-env", "spinoso-env/system-env"]
```

The code that wires up the environment backend indirects the concrete type with
a [conditionally-compiled type alias][env-feature-type-alias] and requires no
other code changes:

```rust
#[cfg(not(feature = "core-env-system"))]
type Backend = spinoso_env::Memory;
#[cfg(feature = "core-env-system")]
type Backend = spinoso_env::System;
```

### Polymorphism

Source-compatible data structure implementations have the following nice
properties:

- Traits don't need to be in scope to use data structure APIs.
- No reliance on trait objects.
- No monomorphization or generics.
- Conditional compilation is lightweight.

[artichoke ruby]: https://www.artichokeruby.org/
[implemented in rust]: https://github.com/artichoke/artichoke
[strangler-fig]: https://martinfowler.com/bliki/StranglerFigApplication.html
[mruby]: https://github.com/mruby/mruby
[fail ci if they have missing documentation]:
  https://github.com/artichoke/artichoke/blob/cc1d0764d2e3252b917608b6a46bf198a90fd9a1/spinoso-array/src/lib.rs#L9-L10
[vision]:
  https://github.com/artichoke/artichoke/blob/cc1d0764d2e3252b917608b6a46bf198a90fd9a1/VISION.md
[`spinoso-array`]:
  https://artichoke.github.io/artichoke/spinoso_array/index.html
[ruby `array`]: https://ruby-doc.org/core-2.6.3/Array.html
[cargo features]: https://doc.rust-lang.org/cargo/reference/features.html
[spinoso-array-array]:
  https://artichoke.github.io/artichoke/spinoso_array/struct.Array.html
[`vec`]: https://doc.rust-lang.org/stable/alloc/vec/struct.Vec.html
[spinoso-array-smallarray]:
  https://artichoke.github.io/artichoke/spinoso_array/struct.SmallArray.html
[`smallvec`]: https://docs.rs/smallvec/1.5.1/smallvec/struct.SmallVec.html
[`spinoso-env`]: https://artichoke.github.io/artichoke/spinoso_env/index.html
[spinoso-env-system]:
  https://artichoke.github.io/artichoke/spinoso_env/struct.System.html
[`std::env`]: https://doc.rust-lang.org/stable/std/env/index.html
[spinoso-env-memory]:
  https://artichoke.github.io/artichoke/spinoso_env/struct.Memory.html
[`hashmap`]:
  https://doc.rust-lang.org/stable/std/collections/struct.HashMap.html
[ruby-env]: https://ruby-doc.org/core-2.6.3/ENV.html
[env-feature]:
  https://github.com/artichoke/artichoke/blob/cc1d0764d2e3252b917608b6a46bf198a90fd9a1/Cargo.toml#L86-L90
[env-feature-type-alias]:
  https://github.com/artichoke/artichoke/blob/cc1d0764d2e3252b917608b6a46bf198a90fd9a1/artichoke-backend/src/extn/core/env/mod.rs#L30-L33
