using System.Text.Json.Serialization;

namespace CarrierCommand.Models;

public class RadarData
{
    [JsonPropertyName("sweepAngle")]
    public double SweepAngle { get; set; }
    [JsonPropertyName("heading")]
    public double Heading { get; set; }
    [JsonPropertyName("enemies")]
    public List<RadarBlip> Enemies { get; set; }
    [JsonPropertyName("units")]
    public List<UnitStatus> Units { get; set; }
    [JsonPropertyName("isGunsEngaged")]
    public bool IsGunsEngaged { get; set; }
    [JsonPropertyName("isSectorNeutralized")]
    public bool IsSectorNeutralized { get; set; }
    [JsonPropertyName("warpTimeRemaining")]
    public double WarpTimeRemaining { get; set; }
    [JsonPropertyName("targetSectorName")]
    public string TargetSectorName { get; set; }
    [JsonPropertyName("carrierHp")]
    public double CarrierHp { get; set; }
    [JsonPropertyName("carrierMaxHp")]
    public double CarrierMaxHp { get; set; }
    [JsonPropertyName("currentPhase")]
    public string CurrentPhase { get; set; }
    [JsonPropertyName("isWarping")]
    public bool IsWarping { get; set; }
}
