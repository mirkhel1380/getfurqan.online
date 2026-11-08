import Foundation
import CryptoKit

struct VerifiedRecitation {
    let key: String
    let title: String
    let artist: String
    let files: [URL]
    let refs: [String]
    let index: Int
}
enum RecitationFiles {
    static let counts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]
    static func validate(library: URL, rootURI: String, key: String, title: String, artist: String, tracks: [[String: Any]], index: Int) throws -> VerifiedRecitation {
        func require(_ value: Bool) throws {if !value {throw NSError(domain: "AlFurqanAudio", code: 1)}}
        try require(key.range(of: #"^(3|6|7)-[0-9]{1,3}$"#, options: .regularExpression) != nil)
        let parts=key.split(separator: "-");let chapter=Int(parts[1]) ?? 0
        try require((1...114).contains(chapter) && key == "\(parts[0])-\(chapter)")
        try require(tracks.count == counts[chapter-1] && index >= 0 && index < tracks.count && !title.isEmpty && title.count <= 120 && !artist.isEmpty && artist.count <= 120)
        guard let rawRoot=URL(string: rootURI), rawRoot.isFileURL, rawRoot.query == nil, (rawRoot.host == nil || rawRoot.host == ""),rawRoot.user == nil,rawRoot.password == nil,rawRoot.fragment == nil else {throw NSError(domain: "AlFurqanAudio", code: 2)}
        let root=rawRoot.resolvingSymlinksInPath().standardizedFileURL, libraryRoot=library.resolvingSymlinksInPath().standardizedFileURL
        try require(root.lastPathComponent == "recitations-v1" && root.path.hasPrefix(libraryRoot.path+"/"))
        var files=[URL](), refs=[String](), total=0
        for (i, row) in tracks.enumerated() {
            guard let path=row["path"] as? String,let ref=row["ref"] as? String,let hash=row["sha256"] as? String,let bytes=row["bytes"] as? Int else {throw NSError(domain: "AlFurqanAudio", code: 3)}
            let verse=i+1, pattern="^recitations-v1/\(key)/[a-f0-9-]{36}-\(verse)\\.mp3$"
            try require(path.range(of: pattern, options: .regularExpression) != nil && ref == "\(chapter):\(verse)" && hash.range(of: #"^[a-f0-9]{64}$"#, options: .regularExpression) != nil)
            let candidate=root.appendingPathComponent(String(path.dropFirst("recitations-v1/".count))).standardizedFileURL
            let file=candidate.resolvingSymlinksInPath().standardizedFileURL
            try require(file.path == candidate.path && file.path.hasPrefix(root.path+"/") && bytes >= 100 && bytes <= 10*1024*1024)
            let resource=try file.resourceValues(forKeys: [.isRegularFileKey,.fileSizeKey]);try require(resource.isRegularFile == true && resource.fileSize == bytes)
            total+=bytes;try require(total <= 200*1024*1024)
            let handle=try FileHandle(forReadingFrom: file);defer {try? handle.close()}
            var digest=SHA256()
            while let data=try handle.read(upToCount: 8192),!data.isEmpty {digest.update(data: data)}
            try require(digest.finalize().map{String(format: "%02x",$0)}.joined() == hash)
            files.append(file);refs.append(ref)
        }
        return VerifiedRecitation(key:key,title:title,artist:artist,files:files,refs:refs,index:index)
    }
}
