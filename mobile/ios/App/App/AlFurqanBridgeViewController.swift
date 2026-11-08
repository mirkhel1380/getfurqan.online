import Capacitor
final class AlFurqanBridgeViewController:CAPBridgeViewController{
    override func capacitorDidLoad(){bridge?.registerPluginInstance(FurqanAudioPlugin())}
}
