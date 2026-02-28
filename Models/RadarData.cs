
using System.Collections.Generic;

namespace CarrierCommand.Models;

public class RadarData
{
    public double SweepAngle { get; set; }
    public double Heading { get; set; }
    public List<RadarBlip> Enemies { get; set; }
    public List<UnitStatus> Units { get; set; }
}
