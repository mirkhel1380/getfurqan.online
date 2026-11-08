package online.getfurqan.app;

import java.io.*;
import java.net.URI;
import java.security.MessageDigest;
import java.util.*;

/** Validates only our completed downloaded verse files; never accepts a remote media URI. */
public final class RecitationFiles {
    public static final int[] COUNTS = {7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6};
    public static final class Track {
        public final String path, ref, sha256;
        public final long bytes;
        public Track(String path, String ref, String sha256, long bytes) {this.path=path;this.ref=ref;this.sha256=sha256;this.bytes=bytes;}
    }
    public static List<File> validate(File expectedRoot, String rootUri, String key, List<Track> tracks) throws Exception {
        if (key==null || !key.matches("(?:3|6|7)-[0-9]{1,3}")) throw new IOException("Invalid recitation");
        int chapter=Integer.parseInt(key.substring(key.indexOf('-')+1));
        if (chapter<1 || chapter>114 || !key.endsWith("-"+chapter) || tracks.size()!=COUNTS[chapter-1]) throw new IOException("Incomplete recitation");
        URI uri=new URI(rootUri);
        if (!"file".equals(uri.getScheme()) || uri.getRawQuery()!=null || uri.getRawFragment()!=null) throw new IOException("Invalid local root");
        File root=expectedRoot.getCanonicalFile();
        if (!new File(uri).getCanonicalFile().equals(root) || !root.isDirectory()) throw new IOException("Invalid local root");
        List<File> files=new ArrayList<>();long total=0;
        for(int i=0;i<tracks.size();i++) {
            Track t=tracks.get(i);int verse=i+1;
            if (!t.path.matches("recitations-v1/"+key+"/[a-f0-9-]{36}-"+verse+"\\.mp3") || !t.ref.equals(chapter+":"+verse) || !t.sha256.matches("[a-f0-9]{64}")) throw new IOException("Mismatched recitation");
            File file=new File(root,t.path.substring("recitations-v1/".length()));File canonical=file.getCanonicalFile();
            if (!canonical.getPath().startsWith(root.getPath()+File.separator) || !canonical.getPath().equals(file.getAbsolutePath()) || !canonical.isFile() || canonical.length()!=t.bytes || t.bytes<100 || t.bytes>10L*1024*1024) throw new IOException("Missing recording");
            total+=t.bytes;if(total>200L*1024*1024) throw new IOException("Recitation too large");
            MessageDigest digest=MessageDigest.getInstance("SHA-256");
            try(InputStream in=new FileInputStream(canonical)) {byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)digest.update(buffer,0,n);}
            StringBuilder actual=new StringBuilder();for(byte b:digest.digest())actual.append(String.format(Locale.ROOT,"%02x",b&255));
            if(!actual.toString().equals(t.sha256))throw new IOException("Damaged recording");
            files.add(canonical);
        }
        return files;
    }
}
