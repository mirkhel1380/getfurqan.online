package online.getfurqan.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;

public class RecitationFilesTest {
    private final String key="7-1",token="11111111-1111-4111-8111-111111111111";
    private List<RecitationFiles.Track> tracks(File root)throws Exception{
        List<RecitationFiles.Track> list=new ArrayList<>();File dir=new File(root,key);dir.mkdirs();
        for(int n=1;n<=7;n++){byte[] bytes=new byte[120];bytes[0]=73;bytes[1]=68;bytes[2]=51;bytes[20]=(byte)n;String path="recitations-v1/"+key+"/"+token+"-"+n+".mp3";Files.write(new File(dir,token+"-"+n+".mp3").toPath(),bytes);StringBuilder sha=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))sha.append(String.format("%02x",b&255));list.add(new RecitationFiles.Track(path,"1:"+n,sha.toString(),bytes.length));}
        return list;
    }
    private void rejects(File root,String uri,String k,List<RecitationFiles.Track> tracks){try{RecitationFiles.validate(root,uri,k,tracks);fail("Unsafe queue accepted");}catch(Exception expected){}}
    @Test public void verifiesCompleteQueueAndRejectsWrongFiles()throws Exception{
        File temp=Files.createTempDirectory("af-audio-test").toFile(),root=new File(temp,"recitations-v1");root.mkdirs();List<RecitationFiles.Track> list=tracks(root);
        assertEquals(7,RecitationFiles.validate(root,root.toURI().toString(),key,list).size());assertEquals(6236,Arrays.stream(RecitationFiles.COUNTS).sum());
        rejects(root,"https://example.invalid/audio",key,list);rejects(root,root.toURI()+"?x=1",key,list);rejects(root,root.toURI().toString(),"7-01",list);rejects(root,root.toURI().toString(),"999-1",list);rejects(root,root.toURI().toString(),key,list.subList(0,6));
        List<RecitationFiles.Track> wrong=new ArrayList<>(list);RecitationFiles.Track first=list.get(0);wrong.set(0,new RecitationFiles.Track("../../private",first.ref,first.sha256,first.bytes));rejects(root,root.toURI().toString(),key,wrong);
        wrong.set(0,new RecitationFiles.Track(first.path,"1:2",first.sha256,first.bytes));rejects(root,root.toURI().toString(),key,wrong);
        Files.write(new File(root,first.path.substring("recitations-v1/".length())).toPath(),new byte[120]);rejects(root,root.toURI().toString(),key,list);
        Files.walk(temp.toPath()).sorted(Comparator.reverseOrder()).forEach(p->{try{Files.delete(p);}catch(Exception e){throw new RuntimeException(e);}});
    }
}
