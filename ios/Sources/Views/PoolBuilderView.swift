import SwiftUI

/// Eigenen Song-Pool bauen: per Suche hinzufügen ODER eine Songliste einfügen
/// (z. B. aus einer exportierten Playlist). Keine Spotify-Daten — 30s-Vorschau.
struct PoolBuilderView: View {
    @EnvironmentObject private var music: MusicSession
    @EnvironmentObject private var themeStore: ThemeStore
    @EnvironmentObject private var modeStore: AppModeStore

    enum Mode: String {
        case search = "Suchen", paste = "Liste"
        #if !APPSTORE
        case spotify = "Spotify"
        #endif
    }
    enum SortBy: String, CaseIterable { case added = "Zuletzt", year = "Jahr", title = "Titel" }

    // Start mit .search (immer ein gültiger Tab) — kein kurzes leeres Picker-Segment.
    @State private var mode: Mode = .search
    @State private var query = ""
    @State private var results: [Track] = []
    @State private var searching = false
    @State private var pasteText = ""
    @State private var importing = false
    @State private var importInfo: String?
    @State private var pool: [Track] = []

    // Spotify-Import (nur private Version) — im APPSTORE-Build komplett raus.
    #if !APPSTORE
    @State private var spotify: SpotifyProvider?
    @State private var spotifyAuthorized = false
    @State private var spotifyPlaylists: [SpotifyPlaylist] = []
    @State private var spotifyBusy = false
    @State private var importingPlaylistId: String?
    #endif
    @State private var sortBy: SortBy = .added
    @State private var poolFilter = ""
    @State private var gameStarted = false
    @State private var errorText: String?

    private var t: AppTheme { themeStore.theme }
    private var poolIDs: Set<String> { Set(pool.map(\.id)) }
    private var modes: [Mode] {
        #if APPSTORE
        return [.search, .paste]
        #else
        return modeStore.spotifyEnabled ? [.spotify, .search, .paste] : [.search, .paste]
        #endif
    }

    private var sortedPool: [Track] {
        let filtered = poolFilter.isEmpty ? pool : pool.filter {
            $0.name.localizedCaseInsensitiveContains(poolFilter) ||
            $0.artist.localizedCaseInsensitiveContains(poolFilter)
        }
        switch sortBy {
        case .added: return filtered.reversed()
        case .year: return filtered.sorted { $0.releaseYear < $1.releaseYear }
        case .title: return filtered.sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
        }
    }

    var body: some View {
        ZStack {
            ThemedBackground()
            ScrollView {
                VStack(spacing: 18) {
                    if !SongPacks.all.isEmpty { packsRow }

                    Picker("", selection: $mode) {
                        ForEach(modes, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    // Bestätigung (z. B. Pack hinzugefügt) tab-unabhängig anzeigen.
                    if let importInfo {
                        Label(importInfo, systemImage: "checkmark.circle.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(t.good)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    switch mode {
                    #if !APPSTORE
                    case .spotify: spotifyCard
                    #endif
                    case .search: searchCard
                    case .paste: pasteCard
                    }

                    poolCard
                    if let errorText {
                        Text(errorText).font(.footnote.weight(.semibold)).foregroundStyle(t.bad)
                    }
                }
                .padding(18)
            }
        }
        .navigationTitle("Eigenen Pool bauen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .bottom) { startBar }
        .navigationDestination(isPresented: $gameStarted) { PlayerSetupView() }
        .onAppear { if !modes.contains(mode) { mode = modes.first ?? .search } }
    }

    // MARK: Fertige Packs

    private var packsRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("FERTIGE PACKS — TIPP HINZUFÜGEN")
                .font(.caption2.weight(.black)).tracking(1.5).foregroundStyle(t.textMuted)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(SongPacks.all) { pack in
                        Button { addPack(pack) } label: {
                            VStack(spacing: 3) {
                                Text(pack.emoji).font(.title2)
                                Text(pack.name).font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(t.text).lineLimit(1).minimumScaleFactor(0.8)
                                Text("\(pack.songs.count)")
                                    .font(.system(size: 9, weight: .bold).monospacedDigit())
                                    .foregroundStyle(t.highlight)
                            }
                            .frame(width: 86)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(t.surface)
                                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(t.surfaceStroke.opacity(0.6), lineWidth: max(t.strokeWidth * 0.6, 1)))
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 2)
            }
        }
        .padding(14).themedCard()
    }

    private func addPack(_ pack: SongPack) {
        var added = 0
        for tr in pack.tracks() where !poolIDs.contains(tr.id) { pool.append(tr); added += 1 }
        importInfo = "\(added) Songs aus \(pack.name) hinzugefügt"
    }

    // MARK: Spotify-Import (private Version)
    #if !APPSTORE

    private var spotifyCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Deine Spotify-Playlist in den Pool laden. Gespielt wird als 30s-Vorschau.")
                .font(.caption).foregroundStyle(t.textMuted)

            if !spotifyAuthorized && !(spotify?.isAuthorized ?? false) {
                Button { connectSpotify() } label: {
                    HStack {
                        if spotifyBusy { ProgressView().tint(t.onAccent) }
                        Label(spotifyBusy ? "Verbinde …" : "Mit Spotify verbinden", systemImage: "music.note")
                    }
                    .font(.subheadline.weight(.black)).foregroundStyle(t.onAccent)
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(Capsule().fill(t.ctaStyle))
                }
                .buttonStyle(.plain).disabled(spotifyBusy)
            } else if spotifyBusy && spotifyPlaylists.isEmpty {
                ProgressView().frame(maxWidth: .infinity)
            } else if spotifyPlaylists.isEmpty {
                Text("Keine Playlists gefunden.").font(.subheadline).foregroundStyle(t.textMuted)
            } else {
                ForEach(spotifyPlaylists) { pl in
                    Button { importPlaylist(pl) } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "music.note.list").foregroundStyle(t.textMuted)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(pl.name).font(.subheadline.weight(.bold)).foregroundStyle(t.text).lineLimit(1)
                                Text("\(pl.trackCount) Songs").font(.caption2).foregroundStyle(t.textMuted)
                            }
                            Spacer()
                            if importingPlaylistId == pl.id { ProgressView().scaleEffect(0.8) }
                            else { Image(systemName: "plus.circle").font(.title3).foregroundStyle(t.accent == t.text ? t.text : t.accent) }
                        }
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain).disabled(importingPlaylistId != nil || spotifyBusy)
                }
            }
        }
        .padding(16).themedCard()
        .task { await autoLoadPlaylists() }
    }

    /// Provider erst hier (nur im Lokal-Modus erreichbar) erzeugen.
    private func ensureSpotify() -> SpotifyProvider {
        if let s = spotify { return s }
        let s = SpotifyProvider()
        spotify = s
        return s
    }

    private func autoLoadPlaylists() async {
        guard modeStore.spotifyEnabled, !spotifyBusy, spotifyPlaylists.isEmpty else { return }
        let s = ensureSpotify()
        guard s.isAuthorized else { return }
        spotifyBusy = true
        defer { spotifyBusy = false }
        do {
            spotifyAuthorized = true
            spotifyPlaylists = try await s.myPlaylists()
        } catch { errorText = error.localizedDescription }
    }

    private func connectSpotify() {
        guard modeStore.spotifyEnabled, !spotifyBusy else { return }
        spotifyBusy = true
        let s = ensureSpotify()
        Task {
            defer { spotifyBusy = false }
            do {
                if !s.isAuthorized { try await s.authorize() }
                spotifyAuthorized = true
                spotifyPlaylists = try await s.myPlaylists()
            } catch {
                errorText = error.localizedDescription
            }
        }
    }

    private func importPlaylist(_ pl: SpotifyPlaylist) {
        guard importingPlaylistId == nil, let s = spotify else { return }
        importingPlaylistId = pl.id
        Task {
            defer { importingPlaylistId = nil }
            do {
                let tracks = try await s.playlistTracks(pl.id)
                var added = 0
                for tr in tracks where !poolIDs.contains(tr.id) {
                    pool.append(tr); added += 1
                }
                importInfo = "\(added) Songs aus \(pl.name) hinzugefügt"
            } catch {
                errorText = error.localizedDescription
            }
        }
    }
    #endif

    // MARK: Suchen

    private var searchCard: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(t.textMuted)
                TextField("Song oder Künstler …", text: $query)
                    .foregroundStyle(t.text)
                    .autocorrectionDisabled()
                    .onSubmit { runSearch() }
                if searching { ProgressView().scaleEffect(0.8) }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(field)

            ForEach(results) { track in
                resultRow(track)
            }
        }
        .padding(16).themedCard()
        .onChange(of: query) { _, _ in scheduleSearch() }
    }

    private func resultRow(_ track: Track) -> some View {
        let added = poolIDs.contains(track.id)
        return Button {
            if added { pool.removeAll { $0.id == track.id } }
            else { pool.append(track) }
        } label: {
            HStack(spacing: 10) {
                Text(String(track.releaseYear))
                    .font(.subheadline.weight(.black).monospacedDigit())
                    .foregroundStyle(t.highlight)
                    .frame(width: 44, alignment: .leading)
                VStack(alignment: .leading, spacing: 1) {
                    Text(track.name).font(.subheadline.weight(.bold)).foregroundStyle(t.text).lineLimit(1)
                    Text(track.artist).font(.caption2).foregroundStyle(t.textMuted).lineLimit(1)
                }
                Spacer()
                Image(systemName: added ? "checkmark.circle.fill" : "plus.circle")
                    .font(.title3)
                    .foregroundStyle(added ? t.good : t.accent == t.text ? t.text : t.accent)
            }
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }

    // MARK: Liste einfügen

    private var pasteCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Eine Songliste einfügen — pro Zeile ein Song (Künstler – Titel). Aus einer exportierten Playlist o. Ä.")
                .font(.caption).foregroundStyle(t.textMuted)
            TextEditor(text: $pasteText)
                .frame(height: 140)
                .foregroundStyle(t.text)
                .scrollContentBackground(.hidden)
                .padding(8)
                .background(field)
            Button {
                runImport()
            } label: {
                HStack {
                    if importing { ProgressView().tint(t.onAccent) }
                    Text(importing ? "Importiere …" : "Importieren")
                }
                .font(.subheadline.weight(.black)).foregroundStyle(t.onAccent)
                .frame(maxWidth: .infinity).padding(.vertical, 12)
                .background(Capsule().fill(t.ctaStyle))
            }
            .buttonStyle(.plain)
            .disabled(importing || pasteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            // importInfo wird global (unter dem Tab-Picker) angezeigt.
        }
        .padding(16).themedCard()
    }

    // MARK: Pool

    private var poolCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("DEIN POOL · \(pool.count)")
                    .font(.caption.weight(.black)).tracking(2).foregroundStyle(t.textMuted)
                Spacer()
                if !pool.isEmpty {
                    Menu {
                        Picker("Sortieren", selection: $sortBy) {
                            ForEach(SortBy.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                        }
                        Button(role: .destructive) { pool.removeAll() } label: { Label("Pool leeren", systemImage: "trash") }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down.circle").foregroundStyle(t.text)
                    }
                }
            }
            if pool.isEmpty {
                Text("Noch leer — such Songs oder füg eine Liste ein.")
                    .font(.subheadline).foregroundStyle(t.textMuted)
            } else {
                if pool.count > 4 {
                    HStack(spacing: 8) {
                        Image(systemName: "line.3.horizontal.decrease").foregroundStyle(t.textMuted).font(.caption)
                        TextField("Pool filtern …", text: $poolFilter).font(.subheadline).foregroundStyle(t.text)
                    }
                    .padding(.horizontal, 12).padding(.vertical, 9).background(field)
                }
                ForEach(sortedPool) { track in
                    HStack(spacing: 10) {
                        Text(String(track.releaseYear))
                            .font(.caption.weight(.black).monospacedDigit()).foregroundStyle(t.highlight)
                            .frame(width: 40, alignment: .leading)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(track.name).font(.subheadline.weight(.semibold)).foregroundStyle(t.text).lineLimit(1)
                            Text(track.artist).font(.caption2).foregroundStyle(t.textMuted).lineLimit(1)
                        }
                        Spacer()
                        Button { pool.removeAll { $0.id == track.id } } label: {
                            Image(systemName: "minus.circle.fill").foregroundStyle(t.textMuted)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 5)
                }
            }
        }
        .padding(16).themedCard()
    }

    private var startBar: some View {
        Button {
            // App-Store-Modus spielt über Apple Music (MusicKit), sonst iTunes-Vorschau.
            let provider: any MusicProvider = modeStore.mode == .appStore
                ? AppleMusicProvider(pool: pool)
                : CatalogProvider(pool: pool)
            music.provider = provider
            gameStarted = true
        } label: {
            Text(pool.count < 8 ? "Mind. 8 Songs (noch \(max(0, 8 - pool.count)))" : "Weiter — \(pool.count) Songs")
                .font(.headline.weight(.black)).foregroundStyle(t.onAccent)
                .frame(maxWidth: .infinity).padding(.vertical, 15)
                .background(Capsule().fill(t.ctaStyle).opacity(pool.count < 8 ? 0.4 : 1).themedShadow(t))
        }
        .buttonStyle(.plain)
        .disabled(pool.count < 8)
        .padding(.horizontal, 18).padding(.bottom, 6)
        .background(t.background.opacity(0.92))
    }

    private var field: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(t.background.opacity(0.6))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(t.surfaceStroke.opacity(0.6), lineWidth: max(t.strokeWidth * 0.6, 1)))
    }

    // MARK: Aktionen

    @State private var searchTask: Task<Void, Never>?
    private func scheduleSearch() {
        searchTask?.cancel()
        let q = query
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            if Task.isCancelled || q != query { return }
            runSearch()
        }
    }

    private func runSearch() {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { results = []; return }
        searching = true
        Task {
            defer { searching = false }
            do { results = try await SongSearch.search(q) }
            catch { errorText = "Suche fehlgeschlagen." }
        }
    }

    private func runImport() {
        let lines = pasteText.split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        guard !lines.isEmpty else { return }
        importing = true
        importInfo = nil
        Task {
            defer { importing = false }
            var added = 0, missed = 0
            for line in lines {
                if let hit = try? await SongSearch.search(line, limit: 1).first {
                    if !poolIDs.contains(hit.id) { pool.append(hit); added += 1 }
                } else { missed += 1 }
            }
            importInfo = "\(added) hinzugefügt" + (missed > 0 ? ", \(missed) nicht gefunden" : "")
        }
    }
}
